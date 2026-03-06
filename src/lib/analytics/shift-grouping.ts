
import { Shift } from "@/types/shift";

// Function to group shifts by day
export const groupShiftsByDay = (shifts: Shift[]): Map<string, Shift[]> => {
  const shiftsByDay = new Map<string, Shift[]>();
  shifts.forEach(shift => {
    if (!shift.startTime) return;
    const date = shift.startTime.toISOString().split('T')[0];
    if (!shiftsByDay.has(date)) {
      shiftsByDay.set(date, []);
    }
    shiftsByDay.get(date)?.push(shift);
  });
  return shiftsByDay;
};

// Helper function to get week number
export const getWeekNumber = (d: Date): number => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(( (Number(d) - Number(yearStart)) / 86400000) / 7);
  return weekNo;
};

// Function to calculate average days worked per week
export const calculateAverageDaysWorkedPerWeek = (shifts: Shift[]): number => {
  if (shifts.length === 0) return 0;

  const shiftsByWeek = new Map<number, Set<string>>();

  shifts.forEach(shift => {
    if (!shift.startTime) return;
    const date = shift.startTime;
    const weekNumber = getWeekNumber(date);
    const dayKey = date.toISOString().split('T')[0];

    if (!shiftsByWeek.has(weekNumber)) {
      shiftsByWeek.set(weekNumber, new Set<string>());
    }

    shiftsByWeek.get(weekNumber)?.add(dayKey);
  });

  let totalDays = 0;
  shiftsByWeek.forEach(days => {
    totalDays += days.size;
  });

  return shiftsByWeek.size > 0 ? totalDays / shiftsByWeek.size : 0;
};

// Function to calculate calendar day incomes
export const calculateCalendarDayIncomes = (shifts: Shift[]): Map<string, number> => {
  const calendarDayIncomes = new Map<string, number>();
  shifts.forEach(shift => {
    if (!shift.startTime || !shift.income) return;
    const date = shift.startTime.toISOString().split('T')[0];
    const income = shift.income || 0;
    calendarDayIncomes.set(date, (calendarDayIncomes.get(date) || 0) + income);
  });
  return calendarDayIncomes;
};

// Function to calculate day totals
export const calculateDayTotals = (shifts: Shift[]): Map<string, number> => {
  const dayTotals = new Map<string, number>();
  shifts.forEach(shift => {
    if (!shift.startTime || !shift.income) return;
    const date = shift.startTime.toISOString().split('T')[0];
    dayTotals.set(date, (dayTotals.get(date) || 0) + (shift.income || 0));
  });
  return dayTotals;
};
