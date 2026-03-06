
import { GigAnalyticsData } from "@/types/shift";

// Structure for shift statistics in Daily Snapshot
export interface ShiftStats {
  latest: {
    income: number;
    hours: number;
    miles: number;
    date: Date | null;
  };
  previous: {
    income: number;
    hours: number;
    miles: number;
  };
  average: {
    income: number;
    hours: number;
    miles: number;
  };
}

// Expanded earnings goal structure
export interface EarningsGoal {
  weeklyGoal: number;
  amountNeeded: number;
  dailyTarget: number;
  currentTotal: number;
  progressPercentage: number;
}

// Data structure for analytics hook
export interface AnalyticsDataHook {
  analytics: GigAnalyticsData | null;
  loading: boolean;
  error: string | null;
  shiftStats: ShiftStats;
  averages: {
    daily: { income: number; hours: number; miles: number };
    weekly: { income: number; hours: number; miles: number };
    yearly: { income: number; hours: number; miles: number };
    weeksWorked?: number;
  };
  earningsGoal: EarningsGoal;
  daysLeftInWeek: number;
  isMobile?: boolean;
  dayTotals: Map<string, number>;
  daysOfWeekWorked: Set<string>;
  calendarDayIncomes: Map<string, number>;
  avgDaysPerWeek: number;
  avgDaysPerWeekAll: number;
  setAnalytics: (analytics: GigAnalyticsData | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}
