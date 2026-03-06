import { GigAnalyticsData } from "@/types/shift";

// Process analytics data to update dayTotals, calendarDayIncomes, and avgDaysPerWeek
export const processCalendarData = (analytics: GigAnalyticsData | null) => {
  if (!analytics) {
    console.log("No analytics data provided for calendar processing");
    return {
      dayTotals: new Map<string, number>(),
      daysOfWeekWorked: new Set<string>(),
      calendarDayIncomes: new Map<string, number>(),
      avgDaysPerWeek: 0,
      avgDaysPerWeekAll: 0
    };
  }

  // Initialize default return structure
  const defaultResult = {
    dayTotals: new Map<string, number>(),
    daysOfWeekWorked: new Set<string>(),
    calendarDayIncomes: new Map<string, number>(),
    avgDaysPerWeek: 0,
    avgDaysPerWeekAll: 0
  };

  // Helper: group dates by week and compute average days/week
  const computeAvgDaysPerWeek = (calendarDayIncomes: Map<string, number>) => {
    const calendarDates = Array.from(calendarDayIncomes.keys()).sort();
    if (calendarDates.length === 0) return 0;

    const weeklyData = new Map();
    calendarDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const mondayDate = new Date(date);
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      mondayDate.setDate(date.getDate() - daysFromMonday);
      const weekKey = mondayDate.toISOString().split('T')[0];
      const weekData = weeklyData.get(weekKey) || { daysWorked: new Set() };
      weekData.daysWorked.add(dayOfWeek);
      weeklyData.set(weekKey, weekData);
    });

    const weeks = Array.from(weeklyData.values());
    const totalDaysWorked = weeks.reduce((sum, week) => sum + week.daysWorked.size, 0);
    return weeks.length > 0 ? totalDaysWorked / weeks.length : 0;
  };

  // First try to use combined shift data (imported + regular)
  if (analytics.allShifts && analytics.allShifts.length > 0) {
    const calendarDayIncomes = new Map<string, number>();
    const dayTotals = new Map<string, number>();
    const daysOfWeekWorked = new Set<string>();

    analytics.allShifts.forEach(record => {
      if (!record.start_time) return;
      const startDate = new Date(record.start_time);
      const dateKey = startDate.toISOString().split('T')[0];
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startDate.getDay()];
      const earnings = Number(record.earnings || 0);
      if (earnings <= 0) return;
      calendarDayIncomes.set(dateKey, (calendarDayIncomes.get(dateKey) || 0) + earnings);
      dayTotals.set(dayOfWeek, (dayTotals.get(dayOfWeek) || 0) + earnings);
      daysOfWeekWorked.add(dayOfWeek);
    });

    if (calendarDayIncomes.size > 0) {
      const avgDaysPerWeek = computeAvgDaysPerWeek(calendarDayIncomes);
      return { dayTotals, daysOfWeekWorked, calendarDayIncomes, avgDaysPerWeek, avgDaysPerWeekAll: avgDaysPerWeek };
    }
  }

  // Fall back to raw shift summaries
  if (analytics.rawShiftSummaries && analytics.rawShiftSummaries.length > 0) {
    const calendarDayIncomes = new Map<string, number>();
    const dayTotals = new Map<string, number>();
    const daysOfWeekWorked = new Set<string>();

    analytics.rawShiftSummaries.forEach(record => {
      if (!record.start_time) return;
      const startDate = new Date(record.start_time);
      const dateKey = startDate.toISOString().split('T')[0];
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startDate.getDay()];
      const earnings = Number(record.earnings || 0);
      if (earnings <= 0) return;
      calendarDayIncomes.set(dateKey, (calendarDayIncomes.get(dateKey) || 0) + earnings);
      dayTotals.set(dayOfWeek, (dayTotals.get(dayOfWeek) || 0) + earnings);
      daysOfWeekWorked.add(dayOfWeek);
    });

    if (calendarDayIncomes.size > 0) {
      const avgDaysPerWeek = computeAvgDaysPerWeek(calendarDayIncomes);
      return { dayTotals, daysOfWeekWorked, calendarDayIncomes, avgDaysPerWeek, avgDaysPerWeekAll: avgDaysPerWeek };
    }
  }

  // Fall back to bin data
  if (analytics.shiftPerformanceByBin && analytics.shiftPerformanceByBin.length > 0) {
    const shiftsWithData = analytics.shiftPerformanceByBin.filter(bin => bin.shift_count > 0);
    const dayTotals = new Map<string, number>();
    shiftsWithData.forEach(bin => {
      dayTotals.set(bin.day, (dayTotals.get(bin.day) || 0) + bin.total_income);
    });
    const daysOfWeekWorked = new Set(shiftsWithData.map(bin => bin.day));
    return {
      dayTotals,
      daysOfWeekWorked,
      calendarDayIncomes: new Map<string, number>(),
      avgDaysPerWeek: daysOfWeekWorked.size,
      avgDaysPerWeekAll: daysOfWeekWorked.size
    };
  }

  return defaultResult;
};
