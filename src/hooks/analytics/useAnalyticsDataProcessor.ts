
import { useState, useEffect, useMemo } from "react";
import { GigAnalyticsData } from "@/types/shift";
import { useAuth } from "@/context/AuthContext";
import { ShiftStats, EarningsGoal } from "./types";
import {
  calculateDaysLeftInWeek,
  calculateEarningsGoal,
  calculateAverages,
  calculateShiftStats
} from "./calculations";
import { processCalendarData } from "./calendar-processing";

interface UseAnalyticsDataProcessorProps {
  analytics: GigAnalyticsData | null;
}

export function useAnalyticsDataProcessor({ analytics }: UseAnalyticsDataProcessorProps) {
  const [dayTotals, setDayTotals] = useState<Map<string, number>>(new Map());
  const [daysOfWeekWorked, setDaysOfWeekWorked] = useState<Set<string>>(new Set());
  const [calendarDayIncomes, setCalendarDayIncomes] = useState<Map<string, number>>(new Map());
  const [avgDaysPerWeek, setAvgDaysPerWeek] = useState<number>(0);
  const [avgDaysPerWeekAll, setAvgDaysPerWeekAll] = useState<number>(0);
  const [shiftStats, setShiftStats] = useState<ShiftStats>({
    latest: { income: 0, hours: 0, miles: 0, date: null },
    previous: { income: 0, hours: 0, miles: 0 },
    average: { income: 0, hours: 0, miles: 0 }
  });

  const { user } = useAuth();

  const daysLeftInWeek = useMemo(() => calculateDaysLeftInWeek(), []);

  useEffect(() => {
    if (!user) {
      setDayTotals(new Map());
      setDaysOfWeekWorked(new Set());
      setCalendarDayIncomes(new Map());
      setAvgDaysPerWeek(0);
      setAvgDaysPerWeekAll(0);
      setShiftStats({
        latest: { income: 0, hours: 0, miles: 0, date: null },
        previous: { income: 0, hours: 0, miles: 0 },
        average: { income: 0, hours: 0, miles: 0 }
      });
      return;
    }

    if (!analytics) {
      setDayTotals(new Map());
      setDaysOfWeekWorked(new Set());
      setCalendarDayIncomes(new Map());
      setAvgDaysPerWeek(0);
      setAvgDaysPerWeekAll(0);
      return;
    }

    const hasActualData = (analytics.allShifts && analytics.allShifts.length > 0) ||
                         (analytics.rawShiftSummaries && analytics.rawShiftSummaries.length > 0);

    if (!hasActualData) {
      setDayTotals(new Map());
      setDaysOfWeekWorked(new Set());
      setCalendarDayIncomes(new Map());
      setAvgDaysPerWeek(0);
      setAvgDaysPerWeekAll(0);
      return;
    }

    const {
      dayTotals: newDayTotals,
      daysOfWeekWorked: newDaysOfWeekWorked,
      calendarDayIncomes: newCalendarDayIncomes,
      avgDaysPerWeek: newAvgDaysPerWeek,
      avgDaysPerWeekAll: newAvgDaysPerWeekAll
    } = processCalendarData(analytics);

    setDayTotals(newDayTotals);
    setDaysOfWeekWorked(newDaysOfWeekWorked);
    setCalendarDayIncomes(newCalendarDayIncomes);
    setAvgDaysPerWeek(newAvgDaysPerWeek);
    setAvgDaysPerWeekAll(newAvgDaysPerWeekAll);
  }, [analytics, user]);

  useEffect(() => {
    if (!user) {
      setShiftStats({
        latest: { income: 0, hours: 0, miles: 0, date: null },
        previous: { income: 0, hours: 0, miles: 0 },
        average: { income: 0, hours: 0, miles: 0 }
      });
      return;
    }
    setShiftStats(calculateShiftStats(analytics));
  }, [analytics, user]);

  const averages = useMemo(() => {
    if (!user) {
      return {
        daily: { income: 0, hours: 0, miles: 0 },
        weekly: { income: 0, hours: 0, miles: 0 },
        yearly: { income: 0, hours: 0, miles: 0 }
      };
    }
    return calculateAverages(analytics, calendarDayIncomes, dayTotals, avgDaysPerWeekAll);
  }, [analytics, dayTotals, calendarDayIncomes, avgDaysPerWeekAll, user]);

  const earningsGoal = useMemo((): EarningsGoal => {
    if (!user) {
      return { weeklyGoal: 0, amountNeeded: 0, dailyTarget: 0, currentTotal: 0, progressPercentage: 0 };
    }
    return calculateEarningsGoal(analytics, averages.weekly.income, daysLeftInWeek);
  }, [analytics, averages.weekly.income, daysLeftInWeek, user]);

  return {
    shiftStats,
    averages,
    earningsGoal,
    daysLeftInWeek,
    dayTotals,
    daysOfWeekWorked,
    calendarDayIncomes,
    avgDaysPerWeek,
    avgDaysPerWeekAll
  };
}
