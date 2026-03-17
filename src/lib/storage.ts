/**
 * Shift persistence.
 * RN version: replaces localStorage with AsyncStorage.
 * All functions are async.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Expense, Shift, ShiftSummary } from "@/types/shift";
import {
  isThisWeek,
  isThisMonth,
  isThisYear,
  subYears,
  getYear,
  startOfYear,
  endOfYear,
  isWithinInterval,
  subWeeks,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";

const SHIFTS_STORAGE_KEY = "lime-tracker-shifts";
const CURRENT_SHIFT_KEY = "lime-tracker-current-shift";

const getDateString = (date: Date) => date.toISOString().split(".")[0] + "Z";

export const saveShifts = async (shifts: Shift[]): Promise<void> => {
  const shiftsToSave = shifts.map((shift) => ({
    ...shift,
    startTime: getDateString(shift.startTime),
    endTime: shift.endTime ? getDateString(shift.endTime) : null,
    pauseTime: shift.pauseTime ? getDateString(shift.pauseTime) : null,
    expenses: shift.expenses.map((expense) => ({
      ...expense,
      timestamp: getDateString(expense.timestamp),
    })),
  }));
  await AsyncStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shiftsToSave));
};

export const getShifts = async (): Promise<Shift[]> => {
  const shiftsJson = await AsyncStorage.getItem(SHIFTS_STORAGE_KEY);
  if (!shiftsJson) return [];
  try {
    const shifts = JSON.parse(shiftsJson);
    return shifts.map((shift: any) => ({
      ...shift,
      startTime: new Date(shift.startTime),
      endTime: shift.endTime ? new Date(shift.endTime) : null,
      pauseTime: shift.pauseTime ? new Date(shift.pauseTime) : null,
      expenses: shift.expenses.map((expense: any) => ({
        ...expense,
        timestamp: new Date(expense.timestamp),
      })),
    }));
  } catch (error) {
    console.error("Error parsing shifts from storage:", error);
    return [];
  }
};

export const saveCurrentShift = async (shift: Shift | null): Promise<void> => {
  if (!shift) {
    await AsyncStorage.removeItem(CURRENT_SHIFT_KEY);
    return;
  }
  const shiftToSave = {
    ...shift,
    startTime: getDateString(shift.startTime),
    endTime: shift.endTime ? getDateString(shift.endTime) : null,
    pauseTime: shift.pauseTime ? getDateString(shift.pauseTime) : null,
    expenses: shift.expenses.map((expense) => ({
      ...expense,
      timestamp: getDateString(expense.timestamp),
    })),
  };
  await AsyncStorage.setItem(CURRENT_SHIFT_KEY, JSON.stringify(shiftToSave));
};

export const getCurrentShift = async (): Promise<Shift | null> => {
  const shiftJson = await AsyncStorage.getItem(CURRENT_SHIFT_KEY);
  if (!shiftJson) return null;
  try {
    const shift = JSON.parse(shiftJson);
    return {
      ...shift,
      startTime: new Date(shift.startTime),
      endTime: shift.endTime ? new Date(shift.endTime) : null,
      pauseTime: shift.pauseTime ? new Date(shift.pauseTime) : null,
      expenses: shift.expenses.map((expense: any) => ({
        ...expense,
        timestamp: new Date(expense.timestamp),
      })),
    };
  } catch (error) {
    console.error("Error parsing current shift from storage:", error);
    return null;
  }
};

export const deleteShift = async (shiftId: string): Promise<void> => {
  const shifts = await getShifts();
  await saveShifts(shifts.filter((s) => s.id !== shiftId));
};

// Pure calculation helpers — no storage, unchanged from web
export const calculateShiftSummary = (
  shift: Shift,
  mileageRate = 0.655
): ShiftSummary => {
  const endTime = shift.endTime || new Date();
  const durationMs = endTime.getTime() - shift.startTime.getTime();
  const effectiveDurationMs = durationMs - (shift.totalPausedTime || 0);
  const totalHours = effectiveDurationMs / (1000 * 60 * 60);
  const totalExpenses = shift.expenses.reduce((sum, e) => sum + e.amount, 0);
  const income = shift.income || 0;
  const mileageStart = shift.mileageStart || 0;
  const mileageEnd = shift.mileageEnd || mileageStart;
  const totalMileage = mileageEnd - mileageStart;
  const netIncome = income - totalExpenses;
  const hourlyAverage = totalHours > 0 ? netIncome / totalHours : 0;
  const mileDeduction = totalMileage * mileageRate;
  return {
    totalHours,
    totalIncome: income,
    totalExpenses,
    netIncome,
    totalMileage,
    hourlyAverage,
    mileDeduction,
  };
};

export const getHistorySummary = (
  shifts: Shift[],
  mileageRate = 0.655
): ShiftSummary => {
  const initial: ShiftSummary = {
    totalHours: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalMileage: 0,
    hourlyAverage: 0,
    mileDeduction: 0,
  };
  const summary = shifts.reduce((acc, shift) => {
    if (!shift.endTime) return acc;
    const s = calculateShiftSummary(shift, mileageRate);
    return {
      totalHours: acc.totalHours + s.totalHours,
      totalIncome: acc.totalIncome + s.totalIncome,
      totalExpenses: acc.totalExpenses + s.totalExpenses,
      netIncome: acc.netIncome + s.netIncome,
      totalMileage: acc.totalMileage + s.totalMileage,
      hourlyAverage: 0,
      mileDeduction: acc.mileDeduction + s.mileDeduction,
    };
  }, initial);
  summary.hourlyAverage =
    summary.totalHours > 0 ? summary.netIncome / summary.totalHours : 0;
  return summary;
};

export const getFilteredShifts = (shifts: Shift[], timePeriod: string): Shift[] => {
  const now = new Date();
  return shifts.filter((shift) => {
    if (!shift.startTime) return false;
    switch (timePeriod) {
      case "week": {
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });
        return isWithinInterval(shift.startTime, { start, end });
      }
      case "prevWeek": {
        const prev = subWeeks(now, 1);
        const start = startOfWeek(prev, { weekStartsOn: 1 });
        const end = endOfWeek(prev, { weekStartsOn: 1 });
        return isWithinInterval(shift.startTime, { start, end });
      }
      case "month":
        return isThisMonth(shift.startTime);
      case "prevMonth": {
        const prev = subMonths(now, 1);
        return isWithinInterval(shift.startTime, {
          start: startOfMonth(prev),
          end: endOfMonth(prev),
        });
      }
      case "ytd":
        return isThisYear(shift.startTime);
      case "prevYear": {
        const prevYear = subYears(now, 1);
        return isWithinInterval(shift.startTime, {
          start: startOfYear(prevYear),
          end: endOfYear(prevYear),
        });
      }
      case "year":
        return shift.startTime >= subYears(now, 1);
      default:
        return true;
    }
  });
};

export const getAvailableYears = (shifts: Shift[]): number[] => {
  const years = new Set<number>([new Date().getFullYear()]);
  shifts.forEach((s) => {
    if (s.endTime) years.add(getYear(s.endTime));
    years.add(getYear(s.startTime));
  });
  return Array.from(years).sort((a, b) => b - a);
};
