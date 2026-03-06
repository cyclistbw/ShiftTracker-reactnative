
import { Shift } from "@/types/shift";
import { hasEnoughData } from "./recommendations";

// Function to calculate best times to work
export const calculateBestTimesToWork = (shifts: Shift[]) => {
  const hourlyEarnings = new Array(24).fill(0);
  const hourlyCounts = new Array(24).fill(0);

  shifts.forEach(shift => {
    if (!shift.startTime || !shift.income) return;
    const startHour = shift.startTime.getHours();
    const endHour = shift.endTime ? shift.endTime.getHours() : 23; // Assume end of day if no end time

    for (let i = startHour; i <= endHour; i++) {
      hourlyEarnings[i] += shift.income || 0;
      hourlyCounts[i]++;
    }
  });

  const averageHourlyEarnings = hourlyEarnings.map((earnings, hour) => {
    return hourlyCounts[hour] > 0 ? earnings / hourlyCounts[hour] : 0;
  });

  return averageHourlyEarnings;
};

// Get shift performance by time bin - optimized to handle combined data
export const getShiftPerformanceByBin = (shifts: any[]) => {
  // Define the bins we'll use for time slots
  const timeSlots = [
    "00:00-02:00", "02:00-04:00", "04:00-06:00", "06:00-08:00",
    "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00",
    "16:00-18:00", "18:00-20:00", "20:00-22:00", "22:00-23:59"
  ];
  
  // Use a Map to aggregate data for each day/time combination
  const binMap = new Map();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Track unique days worked for each day/time combination
  const uniqueDaysMap = new Map();
  
  // Initialize the map with all possible combinations
  for (const day of daysOfWeek) {
    for (const timeSlot of timeSlots) {
      const key = `${day}|${timeSlot}`;
      binMap.set(key, {
        day,
        time_slot: timeSlot,
        shift_count: 0,
        total_income: 0,
        total_hours: 0,
        total_miles: 0,
        unique_work_days: 0
      });
      
      // Initialize a Set to track unique calendar days for each day/time combination
      uniqueDaysMap.set(key, new Set());
    }
  }
  
  // Create a set to track unique shift IDs to prevent duplicates
  const processedShiftIds = new Set();
  
  // Process all shifts (both regular and imported)
  shifts.forEach(shift => {
    if (!shift.start_time) return;
    
    // Skip if we've already processed this shift
    const shiftId = shift.shift_id || (shift.id ? shift.id.toString() : null);
    if (!shiftId) {
      console.warn("Found shift without ID, using start_time as identifier");
    }
    
    const shiftIdentifier = shiftId || shift.start_time;
    if (processedShiftIds.has(shiftIdentifier)) {
      console.log(`Skipping duplicate shift: ${shiftIdentifier}`);
      return;
    }
    
    processedShiftIds.add(shiftIdentifier);
    
    const startTime = new Date(shift.start_time);
    const dayIndex = startTime.getDay();
    const dayOfWeek = daysOfWeek[dayIndex];
    const hour = startTime.getHours();
    
    // Get the calendar date string for tracking unique days
    const calendarDate = startTime.toISOString().split('T')[0];
    
    // Determine time slot based on hour (0-23)
    const timeSlotIndex = Math.floor(hour / 2);
    if (timeSlotIndex >= timeSlots.length) {
      console.warn(`Invalid time slot index: ${timeSlotIndex} for hour: ${hour}`);
      return; // Skip this shift
    }
    
    const timeSlot = timeSlots[timeSlotIndex];
    const key = `${dayOfWeek}|${timeSlot}`;
    
    // Get the bin from the map
    const bin = binMap.get(key);
    if (bin) {
      // Increment the counts and add the values
      bin.shift_count++;
      bin.total_income += Number(shift.earnings || 0);
      bin.total_hours += Number(shift.hours_worked || 0);
      bin.total_miles += Number(shift.miles_driven || 0);
      
      // Add this date to the set of unique days for this day/time combination
      const daysSet = uniqueDaysMap.get(key);
      if (daysSet) {
        daysSet.add(calendarDate);
        bin.unique_work_days = daysSet.size;
      }
    } else {
      console.warn(`Bin not found for key: ${key}, day: ${dayOfWeek}, hour: ${hour}, slot: ${timeSlotIndex}`);
    }
  });
  
  console.log(`Processed ${processedShiftIds.size} unique shifts for time analysis`);
  
  // Convert the map to an array and calculate averages
  const performanceBins = Array.from(binMap.values()).map(bin => {
    // Calculate the derived metrics
    const avgHourlyRate = bin.total_hours > 0 ? bin.total_income / bin.total_hours : 0;
    const avgMilesPerHour = bin.total_hours > 0 ? bin.total_miles / bin.total_hours : 0;
    const earningsPerMile = bin.total_miles > 0 ? bin.total_income / bin.total_miles : 0;
    
    // Calculate composite score: weighs earning rate more heavily than miles efficiency
    const compositeScore = avgHourlyRate > 0 ? 
      (avgHourlyRate * 0.7) + (earningsPerMile * 20 * 0.3) : 0;
    
    return {
      ...bin,
      avg_hourly_rate: avgHourlyRate,
      avg_miles_per_hour: avgMilesPerHour,
      earnings_per_mile: earningsPerMile,
      composite_score: compositeScore
    };
  });
  
  return performanceBins;
};
