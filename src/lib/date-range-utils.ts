import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  format
} from "date-fns";

type TimePeriod = "all" | "week" | "prevWeek" | "month" | "prevMonth" | "ytd" | "prevYear" | "year" | "dateRange";

export const getDateRangeForPeriod = (timePeriod: TimePeriod, customStartDate?: Date, customEndDate?: Date): string => {
  const now = new Date();
  
  switch (timePeriod) {
    case "week": {
      // Monday to Sunday week
      const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
      const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
      return `${format(startOfThisWeek, "MMM d")} - ${format(endOfThisWeek, "MMM d")}`;
    }
    case "prevWeek": {
      const oneWeekAgo = subWeeks(now, 1);
      const startOfPrevWeek = startOfWeek(oneWeekAgo, { weekStartsOn: 1 });
      const endOfPrevWeek = endOfWeek(oneWeekAgo, { weekStartsOn: 1 });
      return `${format(startOfPrevWeek, "MMM d")} - ${format(endOfPrevWeek, "MMM d")}`;
    }
    case "month": {
      const startOfThisMonth = startOfMonth(now);
      const endOfThisMonth = endOfMonth(now);
      return `${format(startOfThisMonth, "MMM d")} - ${format(endOfThisMonth, "MMM d")}`;
    }
    case "prevMonth": {
      const oneMonthAgo = subMonths(now, 1);
      const startOfPrevMonth = startOfMonth(oneMonthAgo);
      const endOfPrevMonth = endOfMonth(oneMonthAgo);
      return `${format(startOfPrevMonth, "MMM d")} - ${format(endOfPrevMonth, "MMM d")}`;
    }
    case "ytd": {
      const startOfThisYear = startOfYear(now);
      return `${format(startOfThisYear, "MMM d")} - ${format(now, "MMM d")}`;
    }
    case "prevYear": {
      const prevYear = subYears(now, 1);
      return `${format(startOfYear(prevYear), "MMM d, yyyy")} - ${format(endOfYear(prevYear), "MMM d, yyyy")}`;
    }
    case "year": {
      const oneYearAgo = subYears(now, 1);
      return `${format(oneYearAgo, "MMM d, yyyy")} - ${format(now, "MMM d, yyyy")}`;
    }
    case "dateRange": {
      if (customStartDate && customEndDate) {
        return `${format(customStartDate, "MMM d")} - ${format(customEndDate, "MMM d")}`;
      }
      return "";
    }
    case "all":
    default:
      return "";
  }
};