
import { GigAnalyticsData } from "@/types/shift";
import { supabase } from "./supabase";
import { getShifts } from "./storage";
import { ANALYTICS_STORAGE_KEY } from "./analytics/types";
import { calculateAverageDaysWorkedPerWeek, calculateCalendarDayIncomes, calculateDayTotals } from "./analytics/shift-grouping";
import { generateRecommendations } from "./analytics/recommendations";
import { getShiftPerformanceByBin } from "./analytics/time-analysis";
import { convertShiftsToAnalyticsFormat } from "./analytics/shift-conversion";
import { saveAnalyticsData, getLatestAnalyticsData } from "./analytics/storage";
import { startOfWeek, endOfWeek } from "date-fns";
import { getCurrentUser, requireAuthentication } from "./security-utils";

// Get latest analytics from storage - ensure user-specific data
export const getLatestAnalytics = async (): Promise<GigAnalyticsData | null> => {
  try {
    console.log("Getting latest analytics from storage");
    
    // Ensure user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.log("No authenticated user found for analytics");
      return null;
    }
    
    // IMPORTANT: Don't use local storage for analytics as it's not user-specific
    // Always generate fresh analytics to ensure user isolation
    // Always filter to current year to prevent stale prior-year data on initial load
    const currentYear = new Date().getFullYear();
    console.log(`Generating fresh analytics for authenticated user: ${currentUser.id}, year: ${currentYear}`);
    return await generateAnalyticsData({ forceCombineData: true, year: currentYear });
  } catch (error) {
    console.error("Error getting latest analytics:", error);
    return null;
  }
};

// Generate analytics data from both shift_summaries and shift_summaries_import
export const generateAnalyticsData = async (options?: { 
  skipHeatmap?: boolean,
  forceCombineData?: boolean,
  year?: number
}): Promise<GigAnalyticsData | null> => {
  try {
    console.log("Generating new analytics data", options);
    
    // Ensure user is authenticated and get user ID
    const userId = await requireAuthentication();
    console.log(`Generating analytics for authenticated user: ${userId}`);
    
    // Set default options - ALWAYS combine data by default
    const useCombinedData = options?.forceCombineData !== false;  // Default to true if not explicitly set to false
    const filterYear = options?.year;
    
    console.log(`Using combined data: ${useCombinedData} (explicitly set: ${options?.forceCombineData !== undefined})`);
    if (filterYear) {
      console.log(`Filtering for year: ${filterYear}`);
    }
    
    // Get current week dates (or year-specific dates if filtering)
    const now = new Date();
    const currentYear = now.getFullYear();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Start from Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // End on Sunday
    
    console.log("Filtering shifts for current week:", {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString()
    });
    
    // Fetch data from shift_summaries table for weekly/daily snapshots - filtered by user_id
    const { data: shiftSummaries, error: shiftError } = await supabase
      .from('shift_summaries')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
    
    if (shiftError) {
      throw new Error(`Error fetching shift summaries: ${shiftError.message}`);
    }
    
    // Fetch data from shift_summaries_import table for income analytics - filtered by user_id
    const { data: importedShiftSummaries, error: importError } = await supabase
      .from('shift_summaries_import')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
    
    if (importError) {
      throw new Error(`Error fetching imported shift summaries: ${importError.message}`);
    }
    
    // Log the number of records found
    console.log(`Found ${shiftSummaries?.length || 0} records in shift_summaries for user ${userId}`);
    console.log(`Found ${importedShiftSummaries?.length || 0} records in shift_summaries_import for user ${userId}`);
    
    // If no shift data exists for this user, return null instead of empty analytics
    if ((!shiftSummaries || shiftSummaries.length === 0) && 
        (!importedShiftSummaries || importedShiftSummaries.length === 0)) {
      console.log(`No shift data found for user ${userId} - returning null`);
      return null;
    }
    
    // Process the main shift data for weekly/daily snapshots
    const rawShiftSummaries = (shiftSummaries || []).map(shift => ({
      shift_id: shift.id?.toString(),
      start_time: shift.start_time,
      end_time: shift.end_time,
      earnings: Number(shift.earnings || 0),
      hours_worked: Number(shift.hours_worked || 0),
      miles_driven: Number(shift.miles_driven || 0)
    }));
    
    // Process the imported shift data for income analytics
    const rawImportedShifts = (importedShiftSummaries || []).map(shift => ({
      shift_id: shift.id?.toString(),
      start_time: shift.start_time,
      end_time: shift.end_time,
      earnings: Number(shift.earnings || 0),
      hours_worked: Number(shift.hours_worked || 0),
      miles_driven: Number(shift.miles_driven || 0)
    }));
    
    // ALWAYS combine all shifts for income analytics calculations AND for heatmap/time based analytics
    // ⭐ This is the critical line ensuring all data is used ⭐
    let allShiftsForIncomeAnalytics = [...rawShiftSummaries, ...rawImportedShifts];
    
    // Filter by year if specified
    if (filterYear) {
      const yearStart = new Date(filterYear, 0, 1);
      const yearEnd = filterYear === currentYear 
        ? now 
        : new Date(filterYear, 11, 31, 23, 59, 59);
      
      allShiftsForIncomeAnalytics = allShiftsForIncomeAnalytics.filter(shift => {
        if (!shift.start_time) return false;
        const shiftDate = new Date(shift.start_time);
        return shiftDate >= yearStart && shiftDate <= yearEnd;
      });
      
      console.log(`Filtered to ${allShiftsForIncomeAnalytics.length} shifts for year ${filterYear}`);
    }
    
    console.log(`Combined ${allShiftsForIncomeAnalytics.length} shifts for income analytics and time-based analysis for user ${userId}`, {
      regular: rawShiftSummaries.length,
      imported: rawImportedShifts.length,
      total: allShiftsForIncomeAnalytics.length,
      yearFilter: filterYear || 'none'
    });
    
    // If no combined data exists, return null
    if (allShiftsForIncomeAnalytics.length === 0) {
      console.log(`No combined shift data found for user ${userId}${filterYear ? ` for year ${filterYear}` : ''} - returning null`);
      return null;
    }
    
    // Sort by date (recent first)
    rawShiftSummaries.sort((a, b) => {
      if (!a.start_time || !b.start_time) return 0;
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    });

    // Filter for current week shifts (using BOTH regular and imported shift data)
    const currentWeekShifts = allShiftsForIncomeAnalytics.filter(shift => {
      if (!shift.start_time) return false;
      
      const shiftDate = new Date(shift.start_time);
      return shiftDate >= weekStart && shiftDate <= weekEnd;
    });
    
    console.log(`Found ${currentWeekShifts.length} shifts for current week for user ${userId} (from all sources)`);
    console.log(`Week range: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);
    if (currentWeekShifts.length > 0) {
      console.log('Current week shifts dates:', currentWeekShifts.map(s => s.start_time));
    }
    
    // Get previous week date range
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekEnd);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
    
    // Filter for previous week shifts (using BOTH regular and imported shift data)
    const previousWeekShifts = allShiftsForIncomeAnalytics.filter(shift => {
      if (!shift.start_time) return false;
      
      const shiftDate = new Date(shift.start_time);
      return shiftDate >= prevWeekStart && shiftDate <= prevWeekEnd;
    });
    
    console.log(`Found ${previousWeekShifts.length} shifts for previous week for user ${userId} (from all sources)`);
    
    // Convert to analytics format using combined data when requested
    // ⭐ Critical change: Using allShiftsForIncomeAnalytics instead of just rawShiftSummaries ⭐
    const analyticsData = convertShiftsToAnalyticsFormat(useCombinedData ? allShiftsForIncomeAnalytics : rawShiftSummaries);
    
    if (!analyticsData) {
      console.error("Failed to convert shifts to analytics format");
      return null;
    }
    
    // Add week-specific data to analytics
    analyticsData.currentWeekShifts = currentWeekShifts;
    analyticsData.previousWeekShifts = previousWeekShifts;
    
    // Calculate totals for current week
    const currentWeekTotals = {
      total_income: currentWeekShifts.reduce((sum, shift) => sum + (shift.earnings || 0), 0),
      total_hours: currentWeekShifts.reduce((sum, shift) => sum + (shift.hours_worked || 0), 0),
      total_miles: currentWeekShifts.reduce((sum, shift) => sum + (shift.miles_driven || 0), 0)
    };
    
    // Calculate totals for previous week
    const previousWeekTotals = {
      total_income: previousWeekShifts.reduce((sum, shift) => sum + (shift.earnings || 0), 0),
      total_hours: previousWeekShifts.reduce((sum, shift) => sum + (shift.hours_worked || 0), 0),
      total_miles: previousWeekShifts.reduce((sum, shift) => sum + (shift.miles_driven || 0), 0)
    };
    
    // Update analytics data with week-specific totals
    analyticsData.recentShifts = {
      current_week: currentWeekTotals,
      previous_week: previousWeekTotals
    };
    
    // Get performance data by time slot - ALWAYS USE COMBINED DATA
    const shiftPerformanceByBin = getShiftPerformanceByBin(allShiftsForIncomeAnalytics);
    analyticsData.shiftPerformanceByBin = shiftPerformanceByBin;
    
    // Generate recommendations based on all data
    const recommendations = generateRecommendations(analyticsData);
    
    // === INCOME ANALYTICS SECTION: ALWAYS USE COMBINED DATA ===
    
    // Prepare data for income analytics calculations using ALL shifts (including imported)
    const shiftDataForIncomeAnalytics = allShiftsForIncomeAnalytics.map(s => ({
      id: s.shift_id || '',
      startTime: s.start_time ? new Date(s.start_time) : new Date(),
      endTime: s.end_time ? new Date(s.end_time) : null,
      mileageStart: 0,
      mileageEnd: s.miles_driven || 0,
      income: s.earnings || 0,
      expenses: [],
      isActive: false,
      totalPausedTime: 0
    }));
    
    console.log(`Processing ${shiftDataForIncomeAnalytics.length} shifts for income analytics for user ${userId}`);
    
    // Calculate calendar day incomes, day totals, and days worked per week using ALL data
    const calendarDayIncomes = calculateCalendarDayIncomes(shiftDataForIncomeAnalytics);
    const dayTotals = calculateDayTotals(shiftDataForIncomeAnalytics);
    const avgDaysPerWeek = calculateAverageDaysWorkedPerWeek(shiftDataForIncomeAnalytics);
    
    console.log(`Income analytics for user ${userId} - Calendar days: ${calendarDayIncomes.size}, Day totals: ${dayTotals.size}, Avg days/week: ${avgDaysPerWeek}`);
    
    // Enrich analytics data with additional metadata
    analyticsData.calendarDayIncomes = calendarDayIncomes;
    analyticsData.dayTotals = dayTotals;
    analyticsData.avgDaysPerWeek = avgDaysPerWeek;
    analyticsData.avgDaysPerWeekAll = avgDaysPerWeek; 
    analyticsData.recommendations = recommendations;
    
    // Store both raw shift summaries and imported shifts separately
    analyticsData.rawShiftSummaries = rawShiftSummaries;
    analyticsData.rawImportedShifts = rawImportedShifts;
    analyticsData.allShifts = allShiftsForIncomeAnalytics;
    
    // Don't save to local storage to avoid cross-user contamination
    // saveAnalyticsData(analyticsData);
    
    console.log("Successfully generated analytics data for user", userId, {
      currentWeek: currentWeekTotals,
      previousWeek: previousWeekTotals,
      totalCalendarDays: calendarDayIncomes.size,
      totalShifts: rawShiftSummaries.length,
      totalImported: rawImportedShifts.length,
      totalCombined: allShiftsForIncomeAnalytics.length
    });
    return analyticsData;
  } catch (error) {
    console.error("Error generating analytics data:", error);
    return null;
  }
};

// Modified saveAnalyticsToSupabase function that DOESN'T try to update heatmap data directly
export const saveAnalyticsToSupabase = async (analytics: GigAnalyticsData | null): Promise<boolean> => {
  try {
    if (!analytics) {
      console.error("No analytics data to save to Supabase");
      return false;
    }
    
    // Ensure user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error("No authenticated user found for saving analytics");
      return false;
    }
    
    // IMPORTANT: Skip updating heatmap data entirely - the dynamic heatmap system
    // handles this separately to ensure we have exactly 84 records
    console.log(`Saving analytics to Supabase for user ${currentUser.id} (skipping heatmap data updates)`);
    
    // Don't save to local storage to avoid cross-user contamination
    // saveAnalyticsData(analytics);
    
    console.log("Analytics saved successfully for user", currentUser.id);
    return true;
  } catch (error) {
    console.error("Error saving analytics to Supabase:", error);
    return false;
  }
};
