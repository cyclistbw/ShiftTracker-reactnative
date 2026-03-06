import { GigAnalyticsData } from "@/types/shift";
import { ShiftStats, EarningsGoal } from "./types";

export const calculateDaysLeftInWeek = (): number => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate days left including today until Sunday (end of week)
  // If today is Sunday (0), then 1 day left (just today), otherwise 8 - currentDay
  return currentDay === 0 ? 1 : 8 - currentDay;
};

export const calculateEarningsGoal = (
  analytics: GigAnalyticsData | null,
  averageWeeklyIncome: number,
  daysLeftInWeek: number
): EarningsGoal => {
  // Return zero state if no analytics data or no average income
  if (!analytics || !averageWeeklyIncome || averageWeeklyIncome <= 0) {
    return {
      weeklyGoal: 0,
      amountNeeded: 0,
      dailyTarget: 0,
      currentTotal: 0,
      progressPercentage: 0
    };
  }

  const currentTotal = analytics.recentShifts?.current_week?.total_income || 0;
  const weeklyGoal = averageWeeklyIncome;
  const amountNeeded = Math.max(0, weeklyGoal - currentTotal);
  const dailyTarget = daysLeftInWeek > 0 ? amountNeeded / daysLeftInWeek : 0;
  const progressPercentage = weeklyGoal > 0 ? Math.min(100, (currentTotal / weeklyGoal) * 100) : 0;

  return {
    weeklyGoal,
    amountNeeded,
    dailyTarget,
    currentTotal,
    progressPercentage
  };
};

export const calculateAverages = (
  analytics: GigAnalyticsData | null,
  calendarDayIncomes: Map<string, number>,
  dayTotals: Map<string, number>,
  avgDaysPerWeekAll: number
) => {
  // Return zero averages if no data exists
  if (!analytics || !calendarDayIncomes || calendarDayIncomes.size === 0) {
    console.log("No analytics data or calendar day incomes - returning zero averages");
    return {
      daily: { income: 0, hours: 0, miles: 0 },
      weekly: { income: 0, hours: 0, miles: 0 },
      yearly: { income: 0, hours: 0, miles: 0 }
    };
  }

  // Calculate total income from calendar day incomes (user-specific data)
  const totalIncome = Array.from(calendarDayIncomes.values()).reduce((sum, income) => sum + income, 0);
  const totalWorkingDays = calendarDayIncomes.size;

  // Return zero if no working days
  if (totalWorkingDays === 0) {
    console.log("No working days found - returning zero averages");
    return {
      daily: { income: 0, hours: 0, miles: 0 },
      weekly: { income: 0, hours: 0, miles: 0 },
      yearly: { income: 0, hours: 0, miles: 0 }
    };
  }

  // Daily averages
  const dailyIncomeAvg = totalIncome / totalWorkingDays;

  // Calculate total hours and miles from combined shifts if available
  let totalHours = 0;
  let totalMiles = 0;

  if (analytics.allShifts && analytics.allShifts.length > 0) {
    totalHours = analytics.allShifts.reduce((sum, shift) => sum + (shift.hours_worked || 0), 0);
    totalMiles = analytics.allShifts.reduce((sum, shift) => sum + (shift.miles_driven || 0), 0);
  }

  const dailyHoursAvg = totalWorkingDays > 0 ? totalHours / totalWorkingDays : 0;
  const dailyMilesAvg = totalWorkingDays > 0 ? totalMiles / totalWorkingDays : 0;

  // Weekly averages
  const weeklyIncomeAvg = avgDaysPerWeekAll > 0 ? dailyIncomeAvg * avgDaysPerWeekAll : 0;
  const weeklyHoursAvg = avgDaysPerWeekAll > 0 ? dailyHoursAvg * avgDaysPerWeekAll : 0;
  const weeklyMilesAvg = avgDaysPerWeekAll > 0 ? dailyMilesAvg * avgDaysPerWeekAll : 0;

  // Yearly projections
  const yearlyIncomeAvg = weeklyIncomeAvg * 52;
  const yearlyHoursAvg = weeklyHoursAvg * 52;
  const yearlyMilesAvg = weeklyMilesAvg * 52;

  return {
    daily: {
      income: dailyIncomeAvg,
      hours: dailyHoursAvg,
      miles: dailyMilesAvg
    },
    weekly: {
      income: weeklyIncomeAvg,
      hours: weeklyHoursAvg,
      miles: weeklyMilesAvg
    },
    yearly: {
      income: yearlyIncomeAvg,
      hours: yearlyHoursAvg,
      miles: yearlyMilesAvg
    }
  };
};

export const calculateShiftStats = (analytics: GigAnalyticsData | null): ShiftStats => {
  // Return zero stats if no analytics data
  if (!analytics || !analytics.allShifts || analytics.allShifts.length === 0) {
    return {
      latest: { income: 0, hours: 0, miles: 0, date: null },
      previous: { income: 0, hours: 0, miles: 0 },
      average: { income: 0, hours: 0, miles: 0 }
    };
  }

  // Sort shifts by date to get latest and previous
  const sortedShifts = [...analytics.allShifts]
    .filter(shift => shift.start_time)
    .sort((a, b) => {
      const dateA = new Date(a.start_time!);
      const dateB = new Date(b.start_time!);
      return dateB.getTime() - dateA.getTime();
    });

  if (sortedShifts.length === 0) {
    return {
      latest: { income: 0, hours: 0, miles: 0, date: null },
      previous: { income: 0, hours: 0, miles: 0 },
      average: { income: 0, hours: 0, miles: 0 }
    };
  }

  const latestShift = sortedShifts[0];
  const previousShift = sortedShifts.length > 1 ? sortedShifts[1] : null;

  // Filter shifts for average calculation - only include shifts with miles > 0
  const shiftsWithMiles = sortedShifts.filter(shift => (shift.miles_driven || 0) > 0);

  const totalShifts = shiftsWithMiles.length;
  const totalIncome = shiftsWithMiles.reduce((sum, shift) => sum + (shift.earnings || 0), 0);
  const totalHours = shiftsWithMiles.reduce((sum, shift) => sum + (shift.hours_worked || 0), 0);
  const totalMiles = shiftsWithMiles.reduce((sum, shift) => sum + (shift.miles_driven || 0), 0);

  return {
    latest: {
      income: latestShift.earnings || 0,
      hours: latestShift.hours_worked || 0,
      miles: latestShift.miles_driven || 0,
      date: latestShift.start_time ? new Date(latestShift.start_time) : null
    },
    previous: {
      income: previousShift?.earnings || 0,
      hours: previousShift?.hours_worked || 0,
      miles: previousShift?.miles_driven || 0
    },
    average: {
      income: totalShifts > 0 ? totalIncome / totalShifts : 0,
      hours: totalShifts > 0 ? totalHours / totalShifts : 0,
      miles: totalShifts > 0 ? totalMiles / totalShifts : 0
    }
  };
};
