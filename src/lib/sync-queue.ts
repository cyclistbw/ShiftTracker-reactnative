/**
 * Persistent retry queue for shifts that failed to sync to Supabase.
 * Stored in AsyncStorage so it survives app restarts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Shift } from "@/types/shift";

const QUEUE_KEY = "shift-sync-retry-queue";
const RETRY_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export interface SyncQueueItem {
  shift: Shift;
  addedAt: number;       // epoch ms when first failed
  nextRetryAt: number;   // epoch ms when next attempt should fire
  attemptCount: number;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const items: SyncQueueItem[] = JSON.parse(raw);
    // Rehydrate Date objects inside shift
    return items.map((item) => ({
      ...item,
      shift: {
        ...item.shift,
        startTime: new Date(item.shift.startTime),
        endTime: item.shift.endTime ? new Date(item.shift.endTime) : null,
      },
    }));
  } catch {
    return [];
  }
}

export async function addToSyncQueue(shift: Shift): Promise<void> {
  const queue = await getSyncQueue();
  // Don't add duplicates
  if (queue.some((item) => item.shift.id === shift.id)) return;
  const now = Date.now();
  queue.push({
    shift,
    addedAt: now,
    nextRetryAt: now + RETRY_INTERVAL_MS,
    attemptCount: 1,
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromSyncQueue(shiftId: string): Promise<void> {
  const queue = await getSyncQueue();
  const updated = queue.filter((item) => item.shift.id !== shiftId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function bumpRetryTime(shiftId: string): Promise<SyncQueueItem | null> {
  const queue = await getSyncQueue();
  let bumped: SyncQueueItem | null = null;
  const updated = queue.map((item) => {
    if (item.shift.id !== shiftId) return item;
    bumped = {
      ...item,
      nextRetryAt: Date.now() + RETRY_INTERVAL_MS,
      attemptCount: item.attemptCount + 1,
    };
    return bumped;
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  return bumped;
}

export async function getDueItems(): Promise<SyncQueueItem[]> {
  const queue = await getSyncQueue();
  const now = Date.now();
  return queue.filter((item) => item.nextRetryAt <= now);
}

export { RETRY_INTERVAL_MS };
