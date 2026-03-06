
import { supabase } from "@/lib/supabase";

export interface DayOfWeekAnalytics {
  day_of_week: string;
  total_shifts: number;
  total_earnings: number;
  total_hours: number;
  average_hourly: number;
  recent_average_hourly: number; // Last 30 days
  seasonal_trend: 'up' | 'down' | 'stable';
}

export const getShiftSummariesByDayOfWeek = async (userId: string): Promise<DayOfWeekAnalytics[]> => {
  try {
    // Get all shift summaries data for the user
    const { data: allShifts, error: allShiftsError } = await supabase
      .from('shift_summaries')
      .select('start_time, earnings, hours_worked')
      .eq('user_id', userId)
      .not('start_time', 'is', null)
      .not('earnings', 'is', null)
      .not('hours_worked', 'is', null)
      .order('start_time', { ascending: false });

    if (allShiftsError) throw allShiftsError;

    // Get recent shifts (last 30 days) for trend analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentShifts, error: recentError } = await supabase
      .from('shift_summaries')
      .select('start_time, earnings, hours_worked')
      .eq('user_id', userId)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .not('start_time', 'is', null)
      .not('earnings', 'is', null)
      .not('hours_worked', 'is', null);

    if (recentError) throw recentError;

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayAnalytics: DayOfWeekAnalytics[] = [];

    for (const dayName of daysOfWeek) {
      // Filter all-time shifts for this day
      const dayShifts = (allShifts || []).filter(shift => {
        const shiftDate = new Date(shift.start_time!);
        const dayIndex = shiftDate.getDay();
        return daysOfWeek[dayIndex] === dayName;
      });

      // Filter recent shifts for this day
      const recentDayShifts = (recentShifts || []).filter(shift => {
        const shiftDate = new Date(shift.start_time!);
        const dayIndex = shiftDate.getDay();
        return daysOfWeek[dayIndex] === dayName;
      });

      const totalEarnings = dayShifts.reduce((sum, shift) => sum + (shift.earnings || 0), 0);
      const totalHours = dayShifts.reduce((sum, shift) => sum + (shift.hours_worked || 0), 0);
      const averageHourly = totalHours > 0 ? totalEarnings / totalHours : 0;

      const recentTotalEarnings = recentDayShifts.reduce((sum, shift) => sum + (shift.earnings || 0), 0);
      const recentTotalHours = recentDayShifts.reduce((sum, shift) => sum + (shift.hours_worked || 0), 0);
      const recentAverageHourly = recentTotalHours > 0 ? recentTotalEarnings / recentTotalHours : 0;

      // Determine seasonal trend
      let seasonalTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentAverageHourly > averageHourly * 1.1) {
        seasonalTrend = 'up';
      } else if (recentAverageHourly < averageHourly * 0.9) {
        seasonalTrend = 'down';
      }

      dayAnalytics.push({
        day_of_week: dayName,
        total_shifts: dayShifts.length,
        total_earnings: totalEarnings,
        total_hours: totalHours,
        average_hourly: averageHourly,
        recent_average_hourly: recentAverageHourly,
        seasonal_trend: seasonalTrend
      });
    }

    return dayAnalytics.filter(day => day.total_shifts > 0);
  } catch (error) {
    console.error('Error fetching shift summaries by day of week:', error);
    throw error;
  }
};

export const getCombinedDayOfWeekInsights = async (userId: string) => {
  try {
    // Get shift summaries analytics
    const shiftAnalytics = await getShiftSummariesByDayOfWeek(userId);

    // Get dynamic heatmap data for comparison
    const { data: heatmapData, error: heatmapError } = await supabase
      .from('dynamic_heatmap_summary')
      .select('day_of_week, average_hourly, unique_work_days, total_earnings')
      .eq('user_id', userId);

    if (heatmapError) throw heatmapError;

    // Combine the insights
    const combinedInsights = shiftAnalytics.map(shiftDay => {
      // Aggregate heatmap data for this day
      const dayHeatmapData = (heatmapData || []).filter(h => 
        h.day_of_week.toLowerCase() === shiftDay.day_of_week.toLowerCase() ||
        h.day_of_week.toLowerCase().startsWith(shiftDay.day_of_week.toLowerCase().substring(0, 3))
      );

      const heatmapAvgHourly = dayHeatmapData.length > 0 
        ? dayHeatmapData.reduce((sum, h) => sum + (h.average_hourly || 0), 0) / dayHeatmapData.length 
        : 0;

      // Calculate weighted average (50% shift summaries, 50% heatmap) - equal weighting
      const weightedAverage = heatmapAvgHourly > 0 
        ? (shiftDay.average_hourly * 0.5) + (heatmapAvgHourly * 0.5)
        : shiftDay.average_hourly;

      const weightedRecentAverage = heatmapAvgHourly > 0 
        ? (shiftDay.recent_average_hourly * 0.5) + (heatmapAvgHourly * 0.5)
        : shiftDay.recent_average_hourly;

      return {
        ...shiftDay,
        heatmap_average_hourly: heatmapAvgHourly,
        weighted_average_hourly: weightedAverage,
        weighted_recent_average_hourly: weightedRecentAverage,
        data_sources: {
          shift_summaries: true,
          heatmap: heatmapAvgHourly > 0
        }
      };
    });

    return combinedInsights.sort((a, b) => b.weighted_recent_average_hourly - a.weighted_recent_average_hourly);
  } catch (error) {
    console.error('Error getting combined day of week insights:', error);
    throw error;
  }
};
