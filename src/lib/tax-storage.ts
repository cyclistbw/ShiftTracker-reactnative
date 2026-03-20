
import { Shift } from "@/types/shift";

export interface TaxReportData {
  totalIncome: number;
  totalExpenses: number;
  totalHours: number;
  totalMileage: number;
  netIncome: number;
  mileDeduction: number;
}

export interface QuarterlyData {
  quarter: number;
  summary: TaxReportData;
}

export interface MonthlyData {
  month: number;
  summary: TaxReportData;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
}

export const getYearlyReportData = (shifts: Shift[], year: number, mileageRate: number = 0.725): TaxReportData => {
  const yearShifts = shifts.filter(shift => {
    const shiftYear = shift.startTime.getFullYear();
    return shiftYear === year && shift.endTime && !shift.isActive;
  });

  const totalIncome = yearShifts.reduce((sum, shift) => sum + (shift.income || 0), 0);
  const totalExpenses = yearShifts.reduce((sum, shift) => {
    return sum + (shift.expenses?.reduce((expSum, exp) => expSum + exp.amount, 0) || 0);
  }, 0);

  const totalHours = yearShifts.reduce((sum, shift) => {
    if (!shift.endTime || shift.isActive) return sum;
    return sum + (shift.endTime.getTime() - shift.startTime.getTime() - (shift.totalPausedTime || 0)) / (1000 * 60 * 60);
  }, 0);

  const totalMileage = yearShifts.reduce((sum, shift) => {
    const mileage = (shift.mileageEnd || 0) - (shift.mileageStart || 0);
    return sum + (mileage > 0 ? mileage : 0);
  }, 0);

  const mileDeduction = totalMileage * mileageRate;
  const netIncome = totalIncome - totalExpenses - mileDeduction;

  return { totalIncome, totalExpenses, totalHours, totalMileage, netIncome, mileDeduction };
};

export const getAvailableYears = (shifts: Shift[]): number[] => {
  const years = new Set<number>();
  shifts.forEach(shift => {
    if (shift.endTime && !shift.isActive) {
      years.add(shift.startTime.getFullYear());
    }
  });
  return Array.from(years).sort((a, b) => b - a);
};

export const getQuarterlyBreakdown = (shifts: Shift[], year: number, mileageRate: number = 0.725): QuarterlyData[] => {
  const quarters: QuarterlyData[] = [];

  for (let quarter = 1; quarter <= 4; quarter++) {
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;

    const quarterShifts = shifts.filter(shift => {
      const shiftYear = shift.startTime.getFullYear();
      const shiftMonth = shift.startTime.getMonth();
      return shiftYear === year && shiftMonth >= startMonth && shiftMonth <= endMonth && shift.endTime && !shift.isActive;
    });

    quarters.push({ quarter, summary: calculateSummaryForShifts(quarterShifts, mileageRate) });
  }

  return quarters;
};

export const getMonthlyBreakdown = (shifts: Shift[], year: number, mileageRate: number = 0.725): MonthlyData[] => {
  const months: MonthlyData[] = [];

  for (let month = 0; month < 12; month++) {
    const monthShifts = shifts.filter(shift => {
      const shiftYear = shift.startTime.getFullYear();
      const shiftMonth = shift.startTime.getMonth();
      return shiftYear === year && shiftMonth === month && shift.endTime && !shift.isActive;
    });

    months.push({ month, summary: calculateSummaryForShifts(monthShifts, mileageRate) });
  }

  return months;
};

export const getCategoryBreakdown = (shifts: Shift[], year: number, mileageRate: number = 0.725): CategoryBreakdown[] => {
  const yearShifts = shifts.filter(shift => {
    const shiftYear = shift.startTime.getFullYear();
    return shiftYear === year && shift.endTime && !shift.isActive;
  });

  const categories = new Map<string, number>();

  yearShifts.forEach(shift => {
    shift.expenses?.forEach(expense => {
      const category = expense.businessPurpose || 'Other';
      categories.set(category, (categories.get(category) || 0) + expense.amount);
    });
  });

  const totalMileage = yearShifts.reduce((sum, shift) => {
    const mileage = (shift.mileageEnd || 0) - (shift.mileageStart || 0);
    return sum + (mileage > 0 ? mileage : 0);
  }, 0);

  if (totalMileage > 0) {
    categories.set('Mileage Deduction', totalMileage * mileageRate);
  }

  return Array.from(categories.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
};

const calculateSummaryForShifts = (shifts: Shift[], mileageRate: number = 0.725): TaxReportData => {
  const totalIncome = shifts.reduce((sum, shift) => sum + (shift.income || 0), 0);
  const totalExpenses = shifts.reduce((sum, shift) => {
    return sum + (shift.expenses?.reduce((expSum, exp) => expSum + exp.amount, 0) || 0);
  }, 0);

  const totalHours = shifts.reduce((sum, shift) => {
    if (!shift.endTime || shift.isActive) return sum;
    return sum + (shift.endTime.getTime() - shift.startTime.getTime() - (shift.totalPausedTime || 0)) / (1000 * 60 * 60);
  }, 0);

  const totalMileage = shifts.reduce((sum, shift) => {
    const mileage = (shift.mileageEnd || 0) - (shift.mileageStart || 0);
    return sum + (mileage > 0 ? mileage : 0);
  }, 0);

  const mileDeduction = totalMileage * mileageRate;
  const netIncome = totalIncome - totalExpenses - mileDeduction;

  return { totalIncome, totalExpenses, totalHours, totalMileage, netIncome, mileDeduction };
};
