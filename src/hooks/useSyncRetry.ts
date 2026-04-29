/**
 * Automatically retries failed shift syncs every 15 minutes.
 *
 * - On mount: immediately retry any overdue items
 * - Every 15 min (setInterval): retry due items
 * - On app foreground (AppState): retry due items
 * - Schedules a local push notification so the user is alerted even if
 *   the app is in the background
 */
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { syncShiftToSupabase } from "@/lib/supabase-functions";
import {
  getSyncQueue,
  getDueItems,
  removeFromSyncQueue,
  bumpRetryTime,
  RETRY_INTERVAL_MS,
} from "@/lib/sync-queue";
import { useToast } from "@/hooks/use-toast";

const NOTIF_CHANNEL = "sync-retry";

async function ensureChannel() {
  try {
    await Notifications.setNotificationChannelAsync(NOTIF_CHANNEL, {
      name: "Sync Retry Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {}
}

async function scheduleRetryNotification(shiftId: string, attemptCount: number, retryAt: number) {
  const identifier = `sync-retry-${shiftId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  const triggerDate = new Date(retryAt);
  if (triggerDate <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: "Shift Sync Failed",
      body: `Attempt ${attemptCount} failed. We'll try again automatically at ${triggerDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: NOTIF_CHANNEL,
    },
  }).catch(() => {});
}

async function cancelRetryNotification(shiftId: string) {
  await Notifications.cancelScheduledNotificationAsync(`sync-retry-${shiftId}`).catch(() => {});
}

export function useSyncRetry() {
  const { toast } = useToast();
  const processingRef = useRef(false);

  const processQueue = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const due = await getDueItems();
      if (due.length === 0) return;

      for (const item of due) {
        try {
          const result = await syncShiftToSupabase(item.shift);
          if (result.success) {
            await removeFromSyncQueue(item.shift.id!);
            await cancelRetryNotification(item.shift.id!);
            toast({
              title: "Shift synced successfully",
              description: `Your shift from ${new Date(item.shift.startTime).toLocaleDateString()} was uploaded to the cloud.`,
            });
          } else {
            const bumped = await bumpRetryTime(item.shift.id!);
            if (bumped) {
              await scheduleRetryNotification(item.shift.id!, bumped.attemptCount, bumped.nextRetryAt);
            }
            toast({
              title: "Sync failed again",
              description: `Attempt ${bumped?.attemptCount ?? item.attemptCount + 1} failed. Will retry automatically in 15 minutes.`,
              variant: "destructive",
            });
          }
        } catch {
          const bumped = await bumpRetryTime(item.shift.id!);
          if (bumped) {
            await scheduleRetryNotification(item.shift.id!, bumped.attemptCount, bumped.nextRetryAt);
          }
        }
      }
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    ensureChannel();

    // Check immediately on mount (catches items that came due while app was closed)
    processQueue();

    // Poll every 15 minutes while app is open
    const interval = setInterval(processQueue, RETRY_INTERVAL_MS);

    // Also check whenever app returns to foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") processQueue();
    };
    const subscription = AppState.addEventListener("change", handleAppState);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // Expose so Index.tsx can trigger a check right after adding to queue
  return { processQueue };
}

export async function getQueueCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}
