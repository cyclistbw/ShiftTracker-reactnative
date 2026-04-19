/**
 * Onboarding completion cache.
 * RN version: replaces localStorage with AsyncStorage.
 * Note: AsyncStorage is async, so callers must await.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY_PREFIX = "st_onboarding_completed_";

// Tracks whether the user has ever seen the intro slides (device-level, not per-account)
const INTRO_SEEN_KEY = "st_intro_slides_seen";

export async function hasSeenIntroSlides(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(INTRO_SEEN_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export function markIntroSlidesSeen() {
  AsyncStorage.setItem(INTRO_SEEN_KEY, "true").catch(() => {});
}
let confirmedCompleteForUser: string | null = null;

function getOnboardingKey(userId: string) {
  return `${ONBOARDING_KEY_PREFIX}${userId}`;
}

export function markOnboardingComplete(userId: string) {
  confirmedCompleteForUser = userId;
  AsyncStorage.setItem(getOnboardingKey(userId), "true").catch(() => {});
}

export function resetOnboardingConfirmation() {
  confirmedCompleteForUser = null;
  AsyncStorage.getAllKeys()
    .then((keys) => {
      const onboardingKeys = keys.filter((k) => k.startsWith(ONBOARDING_KEY_PREFIX));
      return AsyncStorage.multiRemove(onboardingKeys);
    })
    .catch(() => {});
}

export async function isOnboardingConfirmed(userId: string): Promise<boolean> {
  if (confirmedCompleteForUser === userId) return true;
  try {
    const val = await AsyncStorage.getItem(getOnboardingKey(userId));
    const confirmed = val === "true";
    if (confirmed) confirmedCompleteForUser = userId;
    return confirmed;
  } catch {
    return false;
  }
}

export function setOnboardingConfirmed(userId: string) {
  markOnboardingComplete(userId);
}

// ── Direct callback for onboarding completion ─────────────────
// RootNavigation registers a handler; OnboardingSuccess calls triggerOnboardingComplete().
// Avoids DeviceEventEmitter cross-navigator timing issues on iOS.
let _onboardingCompleteHandler: (() => void) | null = null;

export function registerOnboardingCompleteHandler(handler: () => void) {
  _onboardingCompleteHandler = handler;
}

export function triggerOnboardingComplete() {
  _onboardingCompleteHandler?.();
}
