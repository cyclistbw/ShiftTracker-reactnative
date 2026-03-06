import { GigAnalyticsData } from "@/types/shift";

// Helper function to verify and log analytics data, returns true if warnings were found
export const verifyAnalyticsData = (analytics: GigAnalyticsData | null): boolean => {
  if (!analytics) {
    console.log("No analytics data available for verification");
    return false;
  }

  let hasWarnings = false;
  const shiftIds = new Set();
  const potentialDuplicates = new Map();
  let duplicateCount = 0;

  if (analytics.rawShiftSummaries && analytics.rawShiftSummaries.length > 0) {
    analytics.rawShiftSummaries.forEach(shift => {
      const shiftIdentifier = shift.shift_id || shift.start_time;
      if (shiftIds.has(shiftIdentifier)) {
        duplicateCount++;
        const count = potentialDuplicates.get(shiftIdentifier) || 1;
        potentialDuplicates.set(shiftIdentifier, count + 1);
      } else {
        shiftIds.add(shiftIdentifier);
      }
    });

    const missingStartTimes = analytics.rawShiftSummaries.filter(s => !s.start_time).length;
    const missingEarnings = analytics.rawShiftSummaries.filter(s => s.earnings === undefined || s.earnings === null).length;
    if (missingStartTimes > 0) { console.warn(`Found ${missingStartTimes} regular shifts with missing start times`); hasWarnings = true; }
    if (missingEarnings > 0) { console.warn(`Found ${missingEarnings} regular shifts with missing earnings data`); hasWarnings = true; }
  }

  if (analytics.rawImportedShifts && analytics.rawImportedShifts.length > 0) {
    analytics.rawImportedShifts.forEach(shift => {
      const shiftIdentifier = shift.shift_id || shift.start_time;
      if (shiftIds.has(shiftIdentifier)) {
        duplicateCount++;
        const count = potentialDuplicates.get(shiftIdentifier) || 1;
        potentialDuplicates.set(shiftIdentifier, count + 1);
      } else {
        shiftIds.add(shiftIdentifier);
      }
    });

    const missingStartTimes = analytics.rawImportedShifts.filter(s => !s.start_time).length;
    const missingEarnings = analytics.rawImportedShifts.filter(s => s.earnings === undefined || s.earnings === null).length;
    if (missingStartTimes > 0) { console.warn(`Found ${missingStartTimes} imported shifts with missing start times`); hasWarnings = true; }
    if (missingEarnings > 0) { console.warn(`Found ${missingEarnings} imported shifts with missing earnings data`); hasWarnings = true; }
  }

  if (duplicateCount > 0) {
    hasWarnings = true;
    console.warn(`Found ${duplicateCount} potential duplicate shifts`);
  }

  return hasWarnings;
};
