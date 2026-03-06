import { GigAnalyticsData } from "@/types/shift";

// Shared filter function - minimum 2 shifts required for reliable data
export const hasEnoughData = (entry: any) => (entry.unique_work_days || 0) >= 2;

// Function to generate recommendations
export const generateRecommendations = (analytics: GigAnalyticsData): string[] => {
  const recommendations: string[] = [];

  // Check if we have performance data by bin
  if (analytics.shiftPerformanceByBin && analytics.shiftPerformanceByBin.length > 0) {
    // Find best day
    const dayPerformance = new Map();
    
    analytics.shiftPerformanceByBin.forEach(bin => {
      if (!dayPerformance.has(bin.day)) {
        dayPerformance.set(bin.day, {
          totalIncome: 0,
          totalHours: 0,
          shiftCount: 0
        });
      }
      
      const current = dayPerformance.get(bin.day);
      dayPerformance.set(bin.day, {
        totalIncome: current.totalIncome + bin.total_income,
        totalHours: current.totalHours + bin.total_hours,
        shiftCount: current.shiftCount + bin.shift_count
      });
    });
    
    let bestDay = null;
    let bestHourlyRate = 0;
    
    dayPerformance.forEach((value, day) => {
      // Updated to 2 minimum shifts for recommendation
      // Only include days with hourly rates >= $18/hr
      if (value.shiftCount >= 2) {
        const hourlyRate = value.totalHours > 0 ? value.totalIncome / value.totalHours : 0;
        if (hourlyRate >= 18 && hourlyRate > bestHourlyRate) {
          bestHourlyRate = hourlyRate;
          bestDay = day;
        }
      }
    });
    
    if (bestDay) {
      recommendations.push(`Your highest earning day is ${bestDay} at $${bestHourlyRate.toFixed(2)} per hour.`);
    }
    
    // Find best time slot
    const timeSlotPerformance = new Map();
    
    analytics.shiftPerformanceByBin.forEach(bin => {
      if (!timeSlotPerformance.has(bin.time_slot)) {
        timeSlotPerformance.set(bin.time_slot, {
          totalIncome: 0,
          totalHours: 0,
          shiftCount: 0
        });
      }
      
      const current = timeSlotPerformance.get(bin.time_slot);
      timeSlotPerformance.set(bin.time_slot, {
        totalIncome: current.totalIncome + bin.total_income,
        totalHours: current.totalHours + bin.total_hours,
        shiftCount: current.shiftCount + bin.shift_count
      });
    });
    
    let bestTimeSlot = null;
    let bestTimeSlotHourlyRate = 0;
    
    timeSlotPerformance.forEach((value, timeSlot) => {
      // Using 2 minimum shifts for recommendation consistently
      // Only include time slots with hourly rates >= $18/hr
      if (value.shiftCount >= 2) {
        const hourlyRate = value.totalHours > 0 ? value.totalIncome / value.totalHours : 0;
        if (hourlyRate >= 18 && hourlyRate > bestTimeSlotHourlyRate) {
          bestTimeSlotHourlyRate = hourlyRate;
          bestTimeSlot = timeSlot;
        }
      }
    });
    
    if (bestTimeSlot) {
      recommendations.push(`Your most profitable time slot is ${bestTimeSlot} at $${bestTimeSlotHourlyRate.toFixed(2)} per hour.`);
    }
  }

  if (analytics.shiftStats && analytics.shiftStats.avgIncome < 50) {
    recommendations.push("Consider optimizing your work schedule to increase your average income per shift.");
  }

  if (analytics.averages && analytics.averages.daily.hours > 8) {
    recommendations.push("Ensure you're taking adequate breaks to avoid burnout.");
  }

  if (analytics.averages && analytics.averages.daily.miles > 100) {
    recommendations.push("Consider the wear and tear on your vehicle and factor in maintenance costs.");
  }

  // Add some default recommendations when we don't have enough data yet
  if (!analytics.shiftPerformanceByBin || recommendations.length === 0) {
    recommendations.push("Track more shifts to get personalized recommendations (minimum 2 shifts per time slot).");
    recommendations.push("Consider working during peak hours to maximize your earnings.");
    recommendations.push("Track your expenses carefully to optimize your tax deductions.");
  }

  return recommendations;
};
