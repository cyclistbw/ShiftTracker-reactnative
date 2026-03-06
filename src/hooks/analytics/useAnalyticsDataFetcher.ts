
import { useState, useEffect } from "react";
import { GigAnalyticsData } from "@/types/shift";
import { getLatestAnalytics } from "@/lib/analytics-service";
import { useAuth } from "@/context/AuthContext";

export function useAnalyticsDataFetcher() {
  const [analytics, setAnalytics] = useState<GigAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Default empty analytics structure to prevent undefined errors
  const defaultAnalytics: GigAnalyticsData = {
    recentShifts: {
      current_week: {
        total_income: 0,
        total_hours: 0,
        total_miles: 0
      },
      previous_week: {
        total_income: 0,
        total_hours: 0,
        total_miles: 0
      }
    },
    shiftPerformanceByBin: [],
    shiftCompositeScore: []
  };

  // Reset to empty state immediately when no user
  useEffect(() => {
    if (user === null) {
      console.log("No authenticated user - resetting analytics to empty state");
      setAnalytics(defaultAnalytics);
      setError("Authentication required to view analytics.");
      setLoading(false);
      return;
    }

    // Wait for user auth state to be determined before proceeding
    if (user === undefined) {
      console.log("User auth state still loading...");
      setLoading(true);
      return;
    }

    // User is authenticated, proceed with data fetching
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching analytics for authenticated user: ${user.id} (${user.email})`);

        const data = await getLatestAnalytics();

        if (!data) {
          console.log(`No analytics data found for user ${user.email} - user has no shifts`);
          setAnalytics(defaultAnalytics);
          setError("No analytics data found. Add some shifts or generate new analytics using the button below.");
          setLoading(false);
          return;
        }

        const validatedData: GigAnalyticsData = {
          recentShifts: {
            current_week: {
              total_income: data.recentShifts?.current_week?.total_income || 0,
              total_hours: data.recentShifts?.current_week?.total_hours || 0,
              total_miles: data.recentShifts?.current_week?.total_miles || 0
            },
            previous_week: {
              total_income: data.recentShifts?.previous_week?.total_income || 0,
              total_hours: data.recentShifts?.previous_week?.total_hours || 0,
              total_miles: data.recentShifts?.previous_week?.total_miles || 0
            }
          },
          shiftPerformanceByBin: Array.isArray(data.shiftPerformanceByBin) ? data.shiftPerformanceByBin : [],
          shiftCompositeScore: Array.isArray(data.shiftCompositeScore) ? data.shiftCompositeScore : [],
          rawShiftSummaries: data.rawShiftSummaries || [],
          allShifts: data.allShifts || [],
          calendarDayIncomes: data.calendarDayIncomes || new Map(),
          dayTotals: data.dayTotals || new Map(),
          avgDaysPerWeekAll: data.avgDaysPerWeekAll || 0
        };

        setAnalytics(validatedData);
      } catch (err) {
        console.error(`Error fetching analytics for user ${user?.email}:`, err);
        setAnalytics(defaultAnalytics);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  return {
    analytics,
    loading,
    error,
    setAnalytics,
    setError,
    setLoading
  };
}
