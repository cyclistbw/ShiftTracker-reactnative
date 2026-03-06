// 🚩 FLAG: Web version uses localStorage throughout.
// RN replacement: all functions rewritten with AsyncStorage (all async).
// Note: AsyncStorage has no reliable byte-count API; string length is used as approximation.

import AsyncStorage from "@react-native-async-storage/async-storage";

const SHIFTS_KEY = "lime-tracker-shifts";
const CURRENT_SHIFT_KEY = "lime-tracker-current-shift";

export const getStorageUsage = async () => {
  try {
    // 🚩 FLAG: localStorage.length / localStorage.key(i) → AsyncStorage.getAllKeys() + getMany()
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.getMany(keys);

    let totalSize = 0;
    const storageItems: { key: string; size: number }[] = [];

    pairs.forEach(([key, value]) => {
      // 🚩 FLAG: new Blob([value]).size → string length (byte approximation for ASCII/UTF-8)
      const size = (value || '').length;
      totalSize += size;
      storageItems.push({ key, size });
    });

    // AsyncStorage has no enforced quota; using localStorage's 5MB as a reference point
    const QUOTA = 5 * 1024 * 1024;

    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      items: storageItems.sort((a, b) => b.size - a.size),
      quota: QUOTA,
      usagePercent: ((totalSize / QUOTA) * 100).toFixed(1)
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return {
      totalSize: 0,
      totalSizeMB: '0',
      items: [],
      quota: 5 * 1024 * 1024,
      usagePercent: '0'
    };
  }
};

export const cleanupOldShifts = async (maxShiftsToKeep: number = 50): Promise<boolean> => {
  try {
    // 🚩 FLAG: localStorage.getItem → AsyncStorage.getItem
    const shiftsJson = await AsyncStorage.getItem(SHIFTS_KEY);
    if (!shiftsJson) return false;

    const shifts = JSON.parse(shiftsJson);
    if (!Array.isArray(shifts) || shifts.length <= maxShiftsToKeep) return false;

    const sortedShifts = shifts.sort((a: any, b: any) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    const trimmedShifts = sortedShifts.slice(0, maxShiftsToKeep);

    // 🚩 FLAG: localStorage.setItem → AsyncStorage.setItem
    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(trimmedShifts));

    console.log(`Cleaned up old shifts: kept ${trimmedShifts.length} out of ${shifts.length}`);
    return true;
  } catch (error) {
    console.error('Error cleaning up old shifts:', error);
    return false;
  }
};

export const removeImageDataFromLocalStorage = async (): Promise<boolean> => {
  try {
    let cleaned = false;

    // Clean current shift
    const currentShiftJson = await AsyncStorage.getItem(CURRENT_SHIFT_KEY);
    if (currentShiftJson) {
      const currentShift = JSON.parse(currentShiftJson);
      if (currentShift.expenses) {
        currentShift.expenses = currentShift.expenses.map((expense: any) => ({
          ...expense,
          receiptImage: undefined
        }));
        await AsyncStorage.setItem(CURRENT_SHIFT_KEY, JSON.stringify(currentShift));
        cleaned = true;
      }
    }

    // Clean stored shifts
    const shiftsJson = await AsyncStorage.getItem(SHIFTS_KEY);
    if (shiftsJson) {
      const shifts = JSON.parse(shiftsJson);
      const cleanedShifts = shifts.map((shift: any) => ({
        ...shift,
        expenses: shift.expenses ? shift.expenses.map((expense: any) => ({
          ...expense,
          receiptImage: undefined
        })) : []
      }));
      await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(cleanedShifts));
      cleaned = true;
    }

    return cleaned;
  } catch (error) {
    console.error('Error removing image data from AsyncStorage:', error);
    return false;
  }
};

export const emergencyStorageCleanup = async () => {
  console.log('Emergency storage cleanup triggered');

  const beforeUsage = await getStorageUsage();
  console.log('Storage before cleanup:', beforeUsage);

  const imagesRemoved = await removeImageDataFromLocalStorage();
  const shiftsCleanedUp = await cleanupOldShifts(25);

  const afterUsage = await getStorageUsage();
  console.log('Storage after cleanup:', afterUsage);

  return {
    success: imagesRemoved || shiftsCleanedUp,
    beforeSize: beforeUsage.totalSizeMB,
    afterSize: afterUsage.totalSizeMB,
    savedMB: (parseFloat(beforeUsage.totalSizeMB) - parseFloat(afterUsage.totalSizeMB)).toFixed(2)
  };
};

export const checkStorageQuota = async () => {
  const usage = await getStorageUsage();
  const usagePercent = parseFloat(usage.usagePercent);

  if (usagePercent > 90) {
    console.warn('AsyncStorage usage above 90%:', usage);
    return { level: 'critical', usage };
  } else if (usagePercent > 70) {
    console.warn('AsyncStorage usage above 70%:', usage);
    return { level: 'warning', usage };
  }

  return { level: 'ok', usage };
};
