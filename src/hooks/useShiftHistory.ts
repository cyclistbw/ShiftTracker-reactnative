import { useState, useEffect, useMemo, useRef } from "react";
import { Shift, GigAnalyticsData } from "@/types/shift";
// 🚩 FLAG: getShifts() is now async (AsyncStorage) — must be awaited
import { getShifts, getFilteredShifts } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
// 🚩 FLAG: useToast from @/hooks/use-toast is the RN shim — same import path, works as-is
import { useToast } from "@/hooks/use-toast";
import { verifyAnalyticsData } from "@/lib/analytics/data-verification";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { getCachedShifts } from "@/lib/shifts-cache";
// 🚩 FLAG: DateRange from react-day-picker does not exist in RN — defined inline below
import { startOfDay, endOfDay } from "date-fns";

// 🚩 FLAG: DateRange type — replaces import from react-day-picker
export type DateRange = { from?: Date; to?: Date };

type TimePeriod = "all" | "week" | "prevWeek" | "month" | "prevMonth" | "ytd" | "prevYear" | "year" | "dateRange";

const getFilteredShiftsWithDateRange = (shifts: Shift[], timePeriod: TimePeriod, startDate?: Date, endDate?: Date): Shift[] => {
  if (timePeriod === "dateRange" && startDate && endDate) {
    const adjustedStartDate = startOfDay(startDate);
    const adjustedEndDate = endOfDay(endDate);

    return shifts.filter(shift => {
      const shiftDate = shift.startTime;
      return shiftDate >= adjustedStartDate && shiftDate <= adjustedEndDate;
    });
  }

  return getFilteredShifts(shifts, timePeriod);
};

export const useShiftHistory = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const { toast } = useToast();
  const { user } = useAuth();
  const { getFeatureLimits, subscriptionTier } = useSubscription();
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadShifts = async () => {
    setLoading(true);
    setError(null);

    // Android: HTTP requests can hang indefinitely when the connection pool is
    // saturated on first login. Guarantee setLoading(false) after 12 s.
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      console.warn("useShiftHistory safety timeout — forcing loading=false");
      setLoading(false);
    }, 6000);

    try {
      console.log("Starting to load shifts...");

      // Start local AsyncStorage read immediately (runs concurrently with DB queries)
      const localShiftsPromise = getShifts();

      let supabaseShifts: any[] = [];
      let importedShifts: any[] = [];
      let localShifts: Shift[] = [];

      if (user?.id) {
        // Use the shared shifts cache — when TaxReport is also loaded (lazy:false
        // on both tabs) this dedupes the queries instead of firing them twice.
        const [cached, resolvedLocal] = await Promise.all([
          getCachedShifts(user.id),
          localShiftsPromise,
        ]);
        localShifts = resolvedLocal;
        console.log(`Found ${localShifts.length} local shifts`);
        supabaseShifts = cached.regular;
        importedShifts = cached.imported;
        console.log(`shift_summaries returned ${supabaseShifts.length} rows`);
      } else {
        console.log("No authenticated user, skipping Supabase queries");
        localShifts = await localShiftsPromise;
      }

      const analyticsData: GigAnalyticsData = {
        recentShifts: {
          current_week: { total_income: 0, total_hours: 0, total_miles: 0 },
          previous_week: { total_income: 0, total_hours: 0, total_miles: 0 }
        },
        shiftPerformanceByBin: [],
        shiftCompositeScore: [],
        rawShiftSummaries: supabaseShifts.map(record => ({
          shift_id: `supabase-${record.id}`,
          start_time: record.start_time,
          end_time: record.end_time,
          earnings: record.earnings,
          hours_worked: record.hours_worked,
          miles_driven: record.miles_driven
        })),
        rawImportedShifts: importedShifts.map(record => ({
          shift_id: `import-${record.id}`,
          start_time: record.start_time,
          end_time: record.end_time,
          earnings: record.earnings,
          hours_worked: record.hours_worked,
          miles_driven: record.miles_driven
        }))
      };

      const hasWarnings = verifyAnalyticsData(analyticsData);
      setDuplicateWarning(hasWarnings !== undefined && hasWarnings);

      const convertedSupabaseShifts: Shift[] = supabaseShifts.map(record => {
        if (record.summary_data && typeof record.summary_data === 'string') {
          try {
            const parsedData = JSON.parse(record.summary_data);
            if (parsedData.shift) {
              const shift = parsedData.shift;
              return {
                ...shift,
                startTime: new Date(shift.startTime),
                endTime: shift.endTime ? new Date(shift.endTime) : null,
                pauseTime: shift.pauseTime ? new Date(shift.pauseTime) : null,
                expenses: Array.isArray(shift.expenses) ? shift.expenses.map((expense: any) => ({
                  ...expense,
                  timestamp: expense.timestamp ? new Date(expense.timestamp) : new Date(),
                  date: expense.date ? new Date(expense.date) : new Date()
                })) : []
              };
            }
          } catch (e) {
            console.error("Error parsing shift_summaries record:", e);
          }
        }
        return {
          id: `supabase-${record.id}`,
          startTime: new Date(record.start_time || Date.now()),
          endTime: record.end_time ? new Date(record.end_time) : null,
          mileageStart: record.miles_driven ? record.miles_driven : 0,
          mileageEnd: record.miles_driven ? record.miles_driven * 2 : 0,
          income: record.earnings || 0,
          expenses: [],
          isActive: false,
          totalPausedTime: 0
        };
      });

      const convertedImportedShifts: Shift[] = importedShifts.map(record => {
        if (record.summary_data && typeof record.summary_data === 'string') {
          try {
            const parsedData = JSON.parse(record.summary_data);
            if (parsedData.shift) {
              const shift = parsedData.shift;
              return {
                ...shift,
                startTime: new Date(shift.startTime),
                endTime: shift.endTime ? new Date(shift.endTime) : null,
                pauseTime: shift.pauseTime ? new Date(shift.pauseTime) : null,
                expenses: Array.isArray(shift.expenses) ? shift.expenses.map((expense: any) => ({
                  ...expense,
                  timestamp: expense.timestamp ? new Date(expense.timestamp) : new Date(),
                  date: expense.date ? new Date(expense.date) : new Date()
                })) : [],
                imported: true
              };
            }
          } catch (e) {
            console.error("Error parsing imported shift record:", e);
          }
        }
        return {
          id: `import-${record.id}`,
          startTime: new Date(record.start_time || Date.now()),
          endTime: record.end_time ? new Date(record.end_time) : null,
          mileageStart: 0,
          mileageEnd: record.miles_driven || 0,
          income: record.earnings || 0,
          expenses: [],
          isActive: false,
          totalPausedTime: 0,
          imported: true
        };
      });

      const combinedShiftsMap = new Map<string, Shift>();
      localShifts.forEach(shift => combinedShiftsMap.set(shift.id, shift));
      convertedImportedShifts.forEach(shift => combinedShiftsMap.set(shift.id, shift));
      convertedSupabaseShifts.forEach(shift => combinedShiftsMap.set(shift.id, shift));

      const allCombinedShifts = Array.from(combinedShiftsMap.values());

      const filteredShifts = allCombinedShifts.filter(shift => {
        if (shift.imported) return true;
        if (shift.income && shift.income > 0) return true;
        if ((shift.mileageStart !== null && shift.mileageStart !== undefined) ||
            (shift.mileageEnd !== null && shift.mileageEnd !== undefined && shift.mileageEnd >= 0)) {
          return true;
        }
        return false;
      });

      filteredShifts.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

      // Store all shifts unfiltered — subscription limit applied in displayedShifts memo
      // so it auto-reacts when subscriptionTier changes after a fresh-install login
      setShifts(filteredShifts);

    } catch (error) {
      console.error("Exception loading shifts:", error);
      setError("An unexpected error occurred while loading shifts.");
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading shifts.",
        variant: "destructive",
      });

      const localShifts = (await getShifts()).filter(shift => {
        if (shift.imported) return true;
        if (shift.income && shift.income > 0) return true;
        if ((shift.mileageStart !== null && shift.mileageStart !== undefined) ||
            (shift.mileageEnd !== null && shift.mileageEnd !== undefined && shift.mileageEnd >= 0)) {
          return true;
        }
        return false;
      });
      setShifts(localShifts); // also unfiltered — memo handles subscription limit
    } finally {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user === undefined) return;
    // Fire the fetch immediately — don't gate on subscription resolution.
    // Subscription tier only trims the displayed list (applySubscriptionLimits),
    // so it's fine to render shifts before the tier is known and re-render once
    // it arrives.  Gating on initialCheckDone made the page wait up to 3 s
    // (or worse, the full Stripe edge-function round-trip on fresh installs).
    loadShifts();
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [user]);

  const applySubscriptionLimits = (shiftsToLimit: Shift[]): Shift[] => {
    const featureLimits = getFeatureLimits();
    const historyDaysLimit = featureLimits.shift_history_days;

    if (historyDaysLimit === -1) return shiftsToLimit;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - historyDaysLimit);

    return shiftsToLimit.filter(shift => shift.startTime >= cutoffDate);
  };

  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value as TimePeriod);
    if (value !== "dateRange") {
      setDateRange(undefined);
    }
  };

  const displayedShifts = useMemo(() => {
    // Apply subscription tier limit first, then time period filter.
    // subscriptionTier is a dep so this re-runs when the tier loads after login.
    const tierLimited = applySubscriptionLimits(shifts);
    if (timePeriod === "dateRange" && dateRange?.from && dateRange?.to) {
      return getFilteredShiftsWithDateRange(tierLimited, timePeriod, dateRange.from, dateRange.to);
    }
    return getFilteredShiftsWithDateRange(tierLimited, timePeriod);
  }, [shifts, timePeriod, dateRange, subscriptionTier]);

  return {
    shifts: displayedShifts,
    loading,
    error,
    duplicateWarning,
    timePeriod,
    dateRange,
    setDateRange,
    handleTimePeriodChange,
    loadShifts,
    maxHistoryDays: getFeatureLimits().shift_history_days
  };
};
