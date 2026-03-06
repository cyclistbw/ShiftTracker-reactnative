
// Types related to analytics
import { Shift } from "@/types/shift";

// Storage key for analytics in local storage
export const ANALYTICS_STORAGE_KEY = "lime-tracker-analytics";

// Shift totals interface
export interface ShiftTotals {
  totalIncome: number;
  totalHours: number;
  totalMileage: number;
}

// Averages interface
export interface AveragesByPeriod {
  daily: { income: number; hours: number; miles: number };
  weekly: { income: number; hours: number; miles: number };
  yearly: { income: number; hours: number; miles: number };
}
