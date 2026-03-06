
import { Shift } from "@/types/shift";
import { getShiftPerformanceByBin } from "./time-analysis";

// Function to convert Supabase records to Shift objects
export const convertSupabaseRecordsToShifts = (
  supabaseShifts: any[] | null, 
  isImported: boolean = false
): Shift[] => {
  const convertedShifts: Shift[] = [];
  
  if (!supabaseShifts) return convertedShifts;
  
  supabaseShifts.forEach(record => {
    try {
      // Extract shift data from summary_data if available
      if (record.summary_data) {
        let parsedData: any = record.summary_data;
        if (typeof parsedData === 'string') {
          parsedData = JSON.parse(parsedData);
        }
        
        if (parsedData.shift) {
          const shift = parsedData.shift;
          
          // Create shift object with proper Date conversion
          convertedShifts.push({
            id: shift.id || `${isImported ? 'import' : 'supabase'}-${record.id}`,
            startTime: new Date(shift.startTime || record.start_time),
            endTime: shift.endTime ? new Date(shift.endTime) : (record.end_time ? new Date(record.end_time) : null),
            mileageStart: shift.mileageStart || 0,
            mileageEnd: shift.mileageEnd || record.miles_driven || 0,
            income: shift.income || record.earnings || 0,
            tasksCompleted: shift.tasksCompleted || record.tasks_completed || 0,
            expenses: Array.isArray(shift.expenses) ? shift.expenses.map(exp => ({
              ...exp,
              timestamp: exp.timestamp ? new Date(exp.timestamp) : new Date(),
              date: exp.date ? new Date(exp.date) : new Date()
            })) : [],
            isActive: shift.isActive || false,
            totalPausedTime: shift.totalPausedTime || 0,
            imported: isImported,
            isMileageOnly: shift.isMileageOnly || false
          });
          return;
        }
      }
      
      // Fallback to creating shift from record fields
      convertedShifts.push({
        id: `${isImported ? 'import' : 'supabase'}-${record.id}`,
        startTime: new Date(record.start_time || Date.now()),
        endTime: record.end_time ? new Date(record.end_time) : null,
        mileageStart: 0,
        mileageEnd: record.miles_driven || 0,
        income: record.earnings || 0,
        tasksCompleted: record.tasks_completed || 0,
        expenses: [],
        isActive: false,
        totalPausedTime: 0,
        imported: isImported,
        isMileageOnly: record.is_mileage_only || false
      });
    } catch (e) {
      console.error(`Error converting ${isImported ? 'imported' : 'Supabase'} shift ${record.id}:`, e);
    }
  });
  
  return convertedShifts;
};

// Function to convert shifts to analytics format
export const convertShiftsToAnalyticsFormat = (shifts: any[]): any => {
  if (!shifts || shifts.length === 0) return null;
  
  // Filter out mileage-only shifts for analytics calculations
  const analyticsShifts = shifts.filter(shift => !shift.is_mileage_only && !shift.isMileageOnly);
  
  // Sort by date
  analyticsShifts.sort((a, b) => {
    if (!a.start_time || !b.start_time) return 0;
    return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
  });
  
  // Get current date and week start/end dates
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek); // Go back to the beginning of the week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const startOfPreviousWeek = new Date(startOfWeek);
  startOfPreviousWeek.setDate(startOfWeek.getDate() - 7); // Go back one more week
  
  const endOfPreviousWeek = new Date(startOfWeek);
  endOfPreviousWeek.setSeconds(endOfPreviousWeek.getSeconds() - 1); // Just before the current week starts
  
  // Filter shifts for current and previous week
  const currentWeekShifts = analyticsShifts.filter(shift => {
    const shiftDate = new Date(shift.start_time);
    return shiftDate >= startOfWeek && shiftDate <= now;
  });
  
  const previousWeekShifts = analyticsShifts.filter(shift => {
    const shiftDate = new Date(shift.start_time);
    return shiftDate >= startOfPreviousWeek && shiftDate < startOfWeek;
  });
  
  // Calculate totals for current week
  const currentWeekTotals = {
    total_income: currentWeekShifts.reduce((sum, shift) => sum + Number(shift.earnings || 0), 0),
    total_hours: currentWeekShifts.reduce((sum, shift) => sum + Number(shift.hours_worked || 0), 0),
    total_miles: currentWeekShifts.reduce((sum, shift) => sum + Number(shift.miles_driven || 0), 0),
  };
  
  // Calculate totals for previous week
  const previousWeekTotals = {
    total_income: previousWeekShifts.reduce((sum, shift) => sum + Number(shift.earnings || 0), 0),
    total_hours: previousWeekShifts.reduce((sum, shift) => sum + Number(shift.hours_worked || 0), 0),
    total_miles: previousWeekShifts.reduce((sum, shift) => sum + Number(shift.miles_driven || 0), 0),
  };
  
  console.log("Weekly data calculated:", {
    current: currentWeekTotals,
    previous: previousWeekTotals,
    currentWeekShifts: currentWeekShifts.length,
    previousWeekShifts: previousWeekShifts.length
  });
  
  // Get shift performance by bin (using filtered analytics shifts)
  const shiftPerformanceByBin = getShiftPerformanceByBin(analyticsShifts);
  
  // Construct composite scores
  const shiftCompositeScore = shiftPerformanceByBin.map(bin => {
    const normalizedHourlyRate = bin.avg_hourly_rate / 30; // Normalize on scale of 0-1 assuming $30/hr max
    const normalizedMilesEfficiency = bin.earnings_per_mile / 2; // Normalize on scale of 0-1 assuming $2/mile max
    
    return {
      day: bin.day,
      time_slot: bin.time_slot,
      shift_count: bin.shift_count,
      avg_hourly_rate: bin.avg_hourly_rate,
      avg_miles_per_hour: bin.avg_miles_per_hour,
      composite_score: bin.shift_count > 0 ? (normalizedHourlyRate * 0.7 + normalizedMilesEfficiency * 0.3) : 0
    };
  });
  
  // Return the formatted analytics data
  return {
    recentShifts: {
      current_week: currentWeekTotals,
      previous_week: previousWeekTotals,
    },
    shiftPerformanceByBin,
    shiftCompositeScore,
    rawShiftSummaries: analyticsShifts
  };
};
