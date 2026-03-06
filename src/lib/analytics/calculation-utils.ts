
import { Shift, ShiftStats } from "@/types/shift";
import { ShiftTotals, AveragesByPeriod } from "./types";

// Utility function to calculate total income, hours, and miles for a set of shifts
export const calculateTotals = (shifts: Shift[]): ShiftTotals => {
  let totalIncome = 0;
  let totalHours = 0;
  let totalMileage = 0;

  shifts.forEach(shift => {
    totalIncome += shift.income || 0;
    
    if (shift.endTime && shift.startTime) {
      totalHours += (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
    }
    
    totalMileage += (shift.mileageEnd || 0) - (shift.mileageStart || 0);
  });

  return { totalIncome, totalHours, totalMileage };
};

// Utility function to calculate averages
export const calculateAverages = (shifts: Shift[], days: number): AveragesByPeriod => {
  const { totalIncome, totalHours, totalMileage } = calculateTotals(shifts);
  
  const dailyIncome = totalIncome / days;
  const dailyHours = totalHours / days;
  const dailyMileage = totalMileage / days;
  
  return {
    daily: { income: dailyIncome, hours: dailyHours, miles: dailyMileage },
    weekly: { income: dailyIncome * 7, hours: dailyHours * 7, miles: dailyMileage * 7 },
    yearly: { income: dailyIncome * 365, hours: dailyHours * 365, miles: dailyMileage * 365 }
  };
};

// Function to calculate shift statistics
export const calculateShiftStats = (shifts: Shift[]): ShiftStats => {
  const numShifts = shifts.length;
  const totalIncome = shifts.reduce((sum, shift) => sum + (shift.income || 0), 0);
  const totalHours = shifts.reduce((sum, shift) => {
    if (shift.endTime && shift.startTime) {
      return sum + (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
    }
    return sum;
  }, 0);
  const avgIncome = numShifts > 0 ? totalIncome / numShifts : 0;
  const avgHours = numShifts > 0 ? totalHours / numShifts : 0;

  return {
    numShifts,
    totalIncome,
    totalHours,
    avgIncome,
    avgHours,
  };
};

// Function to determine earnings goal progress
export const calculateEarningsGoalProgress = (
  currentWeekIncome: number,
  earningsGoal: number
): number => {
  if (earningsGoal <= 0) return 0;
  return Math.min(1, currentWeekIncome / earningsGoal);
};

// Function to calculate days left in the week
export const calculateDaysLeftInWeek = (): number => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6
  
  // If today is Sunday (0), return 1 (just today)
  // If today is Monday (1), return 7 (full week)
  return dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
};
