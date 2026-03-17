export interface Expense {
  id: string;
  description: string;
  amount: number;
  timestamp: Date;
  date: Date;
  location: string;
  businessPurpose: string;
  receiptImage?: string; // DEBUG: Made optional temporarily for mobile debugging
}

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: string;
  isDefault: boolean;
  mileageRate: number;
  startYearMileage?: number;
  endYearMileage?: number;
}

export interface BusinessSettings {
  businessName: string;
  businessType: string;
  currentTaxYear: string;
  defaultMileageRate: number;
  skipOdometerReading?: boolean;
  gigPlatforms?: string[];
}

export interface ShiftStats {
  numShifts: number;
  totalIncome: number;
  totalHours: number;
  avgIncome: number;
  avgHours: number;
}

export interface Shift {
  id: string;
  startTime: Date;
  endTime: Date | null;
  mileageStart: number | null;
  mileageEnd: number | null;
  income: number | null;
  expenses: Expense[];
  isActive: boolean;
  locations?: Location[];
  isPaused?: boolean;
  pauseTime?: Date | null;
  totalPausedTime?: number; // Total time paused in milliseconds
  vehicleId?: string; // Reference to the vehicle used for the shift
  imported?: boolean; // Flag to indicate if the shift was imported
  isMileageOnly?: boolean; // Flag for mileage-only tracking (no time/income)
  tasksCompleted?: number; // Number of tasks completed during the shift
  platform?: string; // The gig app(s) used for this shift - comma-separated for multi-apping (e.g., "Uber, Lime, DoorDash")
}

export type ShiftSummary = {
  totalHours: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  totalMileage: number;
  hourlyAverage: number;
  mileDeduction: number;
};

// New analytics data structures
export interface ShiftPerformanceBin {
  day: string;
  time_slot: string;
  shift_count: number;
  avg_hourly_rate: number;
  avg_miles_per_hour: number;
  total_hours: number;
  total_income: number;
  total_miles: number;
  earnings_per_mile: number;
  unique_work_days: number;
  updated_at?: string; // Added to match the database column
}

export interface ShiftCompositeScore extends ShiftPerformanceBin {
  composite_score: number;
}

// Type for raw shift summaries from database
export interface RawShiftSummary {
  id: number;
  start_time?: string;
  end_time?: string;
  earnings?: number;
  miles_driven?: number;
  hours_worked?: number;
  platform?: string;
  summary_data?: any;
}

export interface GigAnalyticsData {
  recentShifts: {
    current_week: {
      total_income: number;
      total_hours: number;
      total_miles: number;
    };
    previous_week: {
      total_income: number;
      total_hours: number;
      total_miles: number;
    };
  };
  shiftPerformanceByBin: Array<{
    day: string;
    time_slot: string;
    shift_count: number;
    total_income: number;
    total_hours: number;
    total_miles: number;
    avg_hourly_rate: number;
    avg_miles_per_hour: number;
    earnings_per_mile: number;
    unique_work_days: number;
  }>;
  shiftCompositeScore: Array<{
    day: string;
    time_slot: string;
    shift_count: number;
    avg_hourly_rate: number;
    avg_miles_per_hour: number;
    composite_score: number;
  }>;
  rawShiftSummaries?: Array<{
    shift_id?: string;
    start_time?: string;
    end_time?: string;
    earnings?: number;
    hours_worked?: number;
    miles_driven?: number;
  }>;
  
  // New fields for imported shifts
  rawImportedShifts?: Array<{
    shift_id?: string;
    start_time?: string;
    end_time?: string;
    earnings?: number;
    hours_worked?: number;
    miles_driven?: number;
  }>;
  
  // Combined shifts array for income analytics
  allShifts?: Array<{
    shift_id?: string;
    start_time?: string;
    end_time?: string;
    earnings?: number;
    hours_worked?: number;
    miles_driven?: number;
  }>;
  
  // Additional properties used by our refactored components
  calendarDayIncomes?: Map<string, number>;
  dayTotals?: Map<string, number>;
  daysOfWeekWorked?: Set<string>;
  avgDaysPerWeek?: number;
  avgDaysPerWeekAll?: number;
  
  // Added missing properties based on errors
  shiftStats?: ShiftStats;
  averages?: {
    daily: { income: number; hours: number; miles: number };
    weekly: { income: number; hours: number; miles: number };
    yearly: { income: number; hours: number; miles: number };
  };
  earningsGoalProgress?: number;
  daysLeftInWeek?: number;
  bestTimesToWork?: number[];
  recommendations?: string[];
  
  // New fields for current week and previous week shifts
  currentWeekShifts?: Array<{
    shift_id?: string;
    start_time?: string;
    end_time?: string;
    earnings?: number;
    hours_worked?: number;
    miles_driven?: number;
  }>;
  previousWeekShifts?: Array<{
    shift_id?: string;
    start_time?: string;
    end_time?: string;
    earnings?: number;
    hours_worked?: number;
    miles_driven?: number;
  }>;
}
