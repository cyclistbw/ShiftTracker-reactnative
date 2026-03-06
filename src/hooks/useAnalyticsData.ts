
import { useIsMobile } from "@/hooks/use-mobile";
import { AnalyticsDataHook } from "./analytics/types";
import { useAnalyticsDataFetcher } from "./analytics/useAnalyticsDataFetcher";
import { useAnalyticsDataProcessor } from "./analytics/useAnalyticsDataProcessor";

export function useAnalyticsData(): AnalyticsDataHook {
  const isMobile = useIsMobile();

  // Fetch analytics data
  const {
    analytics,
    loading,
    error,
    setAnalytics,
    setError,
    setLoading
  } = useAnalyticsDataFetcher();

  // Process analytics data
  const {
    shiftStats,
    averages,
    earningsGoal,
    daysLeftInWeek,
    dayTotals,
    daysOfWeekWorked,
    calendarDayIncomes,
    avgDaysPerWeek,
    avgDaysPerWeekAll
  } = useAnalyticsDataProcessor({ analytics });

  return {
    analytics,
    loading,
    error,
    shiftStats,
    averages,
    earningsGoal,
    daysLeftInWeek,
    isMobile,
    dayTotals,
    daysOfWeekWorked,
    calendarDayIncomes,
    avgDaysPerWeek,
    avgDaysPerWeekAll,
    setAnalytics,
    setError,
    setLoading
  };
}
