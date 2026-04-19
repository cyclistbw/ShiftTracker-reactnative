/**
 * Trial tracking + local notification scheduling.
 *
 * Flow:
 *  1. initTrialTracking(userId) — called when user initiates checkout.
 *     Stores trial_start / trial_end in AsyncStorage, schedules 3 local
 *     notifications (3-day warning, 1-day warning, expiry).
 *
 *  2. getTrialStatus(subscribed) — called by SubscriptionContext after
 *     every checkSubscription(). Returns derived trial state.
 *
 *  3. clearTrialTracking() — called when user converts to a paid plan
 *     (trial_end passed AND subscribed === true). Removes storage + cancels
 *     any pending notifications.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const TRIAL_KEY = "st_trial_info";
const TRIAL_NOTIF_IDS_KEY = "st_trial_notif_ids";
const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface TrialInfo {
  userId: string;
  trialStart: string; // ISO
  trialEnd: string;   // ISO
}

export interface TrialStatus {
  isTrialing: boolean;   // active trial, user has elite access
  trialExpired: boolean; // trial ended, user NOT subscribed → show upgrade prompt
  trialDaysLeft: number; // 0 if not trialing
  trialEnd: Date | null;
}

// ── Read / write ──────────────────────────────────────────────

export async function getTrialInfo(): Promise<TrialInfo | null> {
  try {
    const raw = await AsyncStorage.getItem(TRIAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Called when the user taps "Start Trial" and is sent to Stripe checkout.
 * Safe to call multiple times — skips re-init if trial already exists for
 * the same user.
 */
export async function initTrialTracking(userId: string): Promise<void> {
  const existing = await getTrialInfo();
  if (existing?.userId === userId) return; // already tracking

  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + TRIAL_DURATION_MS);

  const info: TrialInfo = {
    userId,
    trialStart: trialStart.toISOString(),
    trialEnd: trialEnd.toISOString(),
  };

  await AsyncStorage.setItem(TRIAL_KEY, JSON.stringify(info));
  await scheduleTrialNotifications(trialEnd);
}

/**
 * Called when trial converts to a paid subscription. Removes all trial
 * data and cancels scheduled notifications.
 */
export async function clearTrialTracking(): Promise<void> {
  await AsyncStorage.removeItem(TRIAL_KEY);
  await cancelScheduledTrialNotifications();
}

// ── Status evaluation ─────────────────────────────────────────

/**
 * Derives the current trial state from stored trial info +
 * the live `subscribed` value from the subscription check.
 *
 * Called after every checkSubscription().
 */
export async function getTrialStatus(subscribed: boolean): Promise<TrialStatus> {
  const NONE: TrialStatus = { isTrialing: false, trialExpired: false, trialDaysLeft: 0, trialEnd: null };

  const info = await getTrialInfo();
  if (!info) return NONE;

  const now = new Date();
  const trialEnd = new Date(info.trialEnd);
  const trialStart = new Date(info.trialStart);
  const msLeft = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

  // Active trial
  if (subscribed && now < trialEnd) {
    return { isTrialing: true, trialExpired: false, trialDaysLeft: daysLeft, trialEnd };
  }

  // Trial ended — user did not subscribe (or subscription lapsed)
  if (!subscribed && now >= trialEnd) {
    return { isTrialing: false, trialExpired: true, trialDaysLeft: 0, trialEnd };
  }

  // Trial ended — user IS subscribed → they converted to paid, clean up
  if (subscribed && now >= trialEnd) {
    await clearTrialTracking();
    return NONE;
  }

  // Checkout was initiated but not completed. Clear after 24 h.
  const hoursSince = (now.getTime() - trialStart.getTime()) / (60 * 60 * 1000);
  if (hoursSince > 24) {
    await clearTrialTracking();
  }

  return NONE;
}

// ── Notification scheduling ───────────────────────────────────

async function scheduleTrialNotifications(trialEnd: Date): Promise<void> {
  // Always cancel stale ones first
  await cancelScheduledTrialNotifications();

  // Request permission — don't throw if denied, just skip scheduling
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const now = new Date();
  const ids: string[] = [];

  const schedule = async (
    offsetMs: number,
    title: string,
    body: string,
    data: object
  ) => {
    const fireDate = new Date(trialEnd.getTime() + offsetMs);
    if (fireDate <= now) return; // already in the past
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
    ids.push(id);
  };

  // 3 days before expiry
  await schedule(
    -3 * 24 * 60 * 60 * 1000,
    "3 days left in your Elite trial",
    "Make the most of your remaining time. Upgrade to keep all premium features.",
    { type: "trial_warning", daysLeft: 3 }
  );

  // 1 day before expiry
  await schedule(
    -1 * 24 * 60 * 60 * 1000,
    "Last day of your Elite trial!",
    "Your trial ends tomorrow. Upgrade now so you don't lose access.",
    { type: "trial_warning", daysLeft: 1 }
  );

  // At expiry
  await schedule(
    0,
    "Your Elite trial has ended",
    "Upgrade to ShiftTracker Elite to keep all your premium features.",
    { type: "trial_expired" }
  );

  if (ids.length > 0) {
    await AsyncStorage.setItem(TRIAL_NOTIF_IDS_KEY, JSON.stringify(ids));
  }
}

async function cancelScheduledTrialNotifications(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(TRIAL_NOTIF_IDS_KEY);
    if (!raw) return;
    const ids: string[] = JSON.parse(raw);
    await Promise.all(
      ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
    );
    await AsyncStorage.removeItem(TRIAL_NOTIF_IDS_KEY);
  } catch {}
}
