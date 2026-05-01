import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Alert, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from "react-native-purchases";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { UsageTracker, FEATURE_KEYS, getFeaturePeriodType } from "@/lib/usage-tracking";
import { initTrialTracking, getTrialStatus, TrialStatus } from "@/lib/trial-notifications";

export type SubscriptionTier = "free" | "basic" | "pro" | "elite";

export interface FeatureAccessResult {
  feature_key: string;
  access: boolean;
  reason: "locked" | "limit_reached" | "upgrade_nudge" | "allowed";
  remaining_uses?: number;
  suggested_plan?: SubscriptionTier;
  benefit?: string;
}

const FEATURE_ACCESS: Record<SubscriptionTier, string[]> = {
  free: ["shift_tracking", "mileage_tracking", "trial_access"],
  basic: [
    "shift_tracking",
    "mileage_tracking",
    "tax_tools",
    "daily_snapshot",
    "weekly_snapshot",
    "income_analytics",
    "shiftbuddy",
    "basic_goal_setting",
    "shift_history_30_days",
    "heatmap_data_30_day",
  ],
  pro: [
    "shift_tracking",
    "mileage_tracking",
    "tax_tools",
    "daily_snapshot",
    "weekly_snapshot",
    "income_analytics",
    "seasonal_earnings_analysis",
    "dynamic_heatmap",
    "recommendations",
    "shiftbuddy",
    "shift_history_90_days",
    "heatmap_data_90_day",
    "coaching",
    "custom_time_blocks",
  ],
  elite: [
    "shift_tracking",
    "mileage_tracking",
    "tax_tools",
    "daily_snapshot",
    "weekly_snapshot",
    "income_analytics",
    "seasonal_earnings_analysis",
    "dynamic_heatmap",
    "recommendations",
    "shiftbuddy_chat",
    "unlimited_ai_calls",
    "unlimited_historical_data",
    "extended_shift_history",
    "custom_recommendations_filtering",
    "zone_level_recommendations",
    "predictive_planner",
    "ai_shift_efficiency_score",
    "export_data",
    "priority_support",
    "early_access_features",
    "shiftbuddy",
  ],
};

export interface FeatureLimits {
  shift_history_days: number;
  dynamic_heatmap_days: number;
}

type SubscriptionContextType = {
  subscribed: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionEnd: string | null;
  isLoading: boolean;
  initialCheckDone: boolean;
  isTrialing: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
  trialEnd: Date | null;
  checkSubscription: (forceRefresh?: boolean) => Promise<void>;
  purchaseSubscription: (type: "monthly" | "annual") => Promise<void>;
  restorePurchases: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  checkFeatureAccess: (feature: string, currentUsage?: number) => Promise<FeatureAccessResult>;
  useFeature: (feature: string) => Promise<{ success: boolean; message?: string }>;
  getFeatureLimits: () => FeatureLimits;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Must match the entitlement identifier you create in the RevenueCat dashboard
const RC_ENTITLEMENT = "elite";

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialEnd, setTrialEnd] = useState<Date | null>(null);
  const rcConfigured = useRef(false);

  // Load cached subscription from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem("subscription_status").then((cached) => {
      if (!cached) return;
      try {
        const data = JSON.parse(cached);
        if (data.expiry && new Date(data.expiry) > new Date()) {
          setSubscribed(data.subscribed || false);
          setSubscriptionTier(data.tier || "free");
          setSubscriptionEnd(data.end || null);
        }
      } catch {}
    });
  }, []);

  // Configure RevenueCat whenever the authenticated user changes
  useEffect(() => {
    if (!user) {
      rcConfigured.current = false;
      return;
    }
    const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
    const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
    const apiKey = Platform.OS === "ios" ? iosKey : androidKey;
    if (!apiKey) {
      console.warn("[RC] RevenueCat API key not set — add EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY to EAS env");
      return;
    }
    try {
      Purchases.configure({ apiKey, appUserID: user.id });
      rcConfigured.current = true;
    } catch (err) {
      console.warn("[RC] configure error:", err);
    }
  }, [user?.id]);

  const cacheSubscriptionData = useCallback(
    async (data: { subscribed: boolean; tier: SubscriptionTier; end: string | null }) => {
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await AsyncStorage.setItem(
        "subscription_status",
        JSON.stringify({
          ...data,
          lastVerified: new Date().toISOString(),
          expiry,
          userId: user?.id,
        })
      );
    },
    [user]
  );

  // Sync to Supabase so server-side Edge Functions (feature gates, etc.) stay current
  const syncToSupabase = useCallback(
    async (isSubscribed: boolean, tier: SubscriptionTier, subEnd: string | null) => {
      if (!user?.email) return;
      await supabase
        .from("subscribers")
        .upsert(
          {
            email: user.email,
            user_id: user.id,
            subscribed: isSubscribed,
            subscription_tier: tier,
            subscription_end: subEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "email" }
        )
        .catch((err) => console.warn("[RC] Supabase sync error:", err));
    },
    [user]
  );

  const checkSubscription = useCallback(
    async (forceRefresh = false) => {
      if (!user || !session) {
        setSubscribed(false);
        setSubscriptionTier("free");
        setSubscriptionEnd(null);
        setInitialCheckDone(true);
        return;
      }

      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem("subscription_status");
        if (cached) {
          try {
            const data = JSON.parse(cached);
            const age = Date.now() - new Date(data.lastVerified || 0).getTime();
            if (age < 2 * 60 * 60 * 1000 && data.userId === user.id) {
              setSubscribed(data.subscribed || false);
              setSubscriptionTier(data.tier || "free");
              setSubscriptionEnd(data.end || null);
              setInitialCheckDone(true);
              return;
            }
          } catch {}
        }
      }

      if (!rcConfigured.current) {
        setInitialCheckDone(true);
        return;
      }

      setIsLoading(true);
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const activeEntitlement = customerInfo.entitlements.active[RC_ENTITLEMENT];
        const isSubscribed = activeEntitlement !== undefined;
        const tier: SubscriptionTier = isSubscribed ? "elite" : "free";
        const subEnd = activeEntitlement?.expirationDate ?? null;

        setSubscribed(isSubscribed);
        setSubscriptionTier(tier);
        setSubscriptionEnd(subEnd);
        await cacheSubscriptionData({ subscribed: isSubscribed, tier, end: subEnd });
        await syncToSupabase(isSubscribed, tier, subEnd);

        const trial: TrialStatus = await getTrialStatus(isSubscribed);
        setIsTrialing(trial.isTrialing);
        setTrialDaysLeft(trial.trialDaysLeft);
        setTrialExpired(trial.trialExpired);
        setTrialEnd(trial.trialEnd);
      } catch (error) {
        console.error("[RC] checkSubscription failed:", error);
      } finally {
        setIsLoading(false);
        setInitialCheckDone(true);
      }
    },
    [user, session, cacheSubscriptionData, syncToSupabase]
  );

  const purchaseSubscription = useCallback(
    async (type: "monthly" | "annual") => {
      if (!user) {
        Alert.alert("Not Signed In", "Please sign in to purchase a subscription.");
        return;
      }
      if (!rcConfigured.current) {
        Alert.alert("Configuration Error", "Payment system not ready. Please restart the app and try again.");
        return;
      }
      let purchaseSucceeded = false;
      try {
        const offerings = await Purchases.getOfferings();
        const pkg = type === "monthly" ? offerings.current?.monthly : offerings.current?.annual;

        if (!pkg) {
          Alert.alert(
            "Not Available",
            "This subscription package is not available right now. Please try again later.",
            [{ text: "OK" }]
          );
          return;
        }

        await initTrialTracking(user.id);
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        const activeEntitlement = customerInfo.entitlements.active[RC_ENTITLEMENT];
        const isSubscribed = activeEntitlement !== undefined;

        if (isSubscribed) {
          purchaseSucceeded = true;
          const subEnd = activeEntitlement?.expirationDate ?? null;
          setSubscribed(true);
          setSubscriptionTier("elite");
          setSubscriptionEnd(subEnd);
          cacheSubscriptionData({ subscribed: true, tier: "elite", end: subEnd }).catch(() => {});
          syncToSupabase(true, "elite", subEnd).catch(() => {});
        }
      } catch (err: any) {
        if (err?.userCancelled) return;
        if (purchaseSucceeded) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[RC] purchaseSubscription failed:", msg);
        Alert.alert("Purchase Failed", msg, [{ text: "OK" }]);
      }
    },
    [user, cacheSubscriptionData, syncToSupabase]
  );

  const restorePurchases = useCallback(async () => {
    if (!rcConfigured.current) return;
    try {
      const customerInfo = await Purchases.restorePurchases();
      const activeEntitlement = customerInfo.entitlements.active[RC_ENTITLEMENT];
      const isSubscribed = activeEntitlement !== undefined;
      const tier: SubscriptionTier = isSubscribed ? "elite" : "free";
      const subEnd = activeEntitlement?.expirationDate ?? null;

      setSubscribed(isSubscribed);
      setSubscriptionTier(tier);
      setSubscriptionEnd(subEnd);
      await cacheSubscriptionData({ subscribed: isSubscribed, tier, end: subEnd });
      await syncToSupabase(isSubscribed, tier, subEnd);

      Alert.alert(
        isSubscribed ? "Purchases Restored" : "No Purchases Found",
        isSubscribed
          ? "Your Elite subscription has been restored."
          : "No active subscriptions were found for this account.",
        [{ text: "OK" }]
      );
    } catch (err: any) {
      if (err?.userCancelled) return;
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Restore Failed", msg, [{ text: "OK" }]);
    }
  }, [cacheSubscriptionData, syncToSupabase]);

  const openCustomerPortal = useCallback(async () => {
    try {
      await Purchases.showManageSubscriptions();
    } catch {
      // Fallback: open platform subscription management directly
      const url =
        Platform.OS === "ios"
          ? "itms-apps://apps.apple.com/account/subscriptions"
          : "https://play.google.com/store/account/subscriptions";
      await Linking.openURL(url).catch(() => {});
    }
  }, []);

  const hasFeature = useCallback(
    (feature: string) => FEATURE_ACCESS[subscriptionTier]?.includes(feature) ?? false,
    [subscriptionTier]
  );

  const canAccessFeature = useCallback(
    (feature: string) => hasFeature(feature),
    [hasFeature]
  );

  const checkFeatureAccess = useCallback(
    async (feature: string, _currentUsage = 0): Promise<FeatureAccessResult> => {
      if (!user?.id) return { feature_key: feature, access: false, reason: "locked" };
      try {
        const periodType = getFeaturePeriodType(feature);
        const actualPeriodType =
          feature === FEATURE_KEYS.SHIFTBUDDY_CHAT && subscriptionTier === "free"
            ? "weekly"
            : periodType;
        const usageResult = await UsageTracker.checkUsageLimit(user.id, feature, actualPeriodType);
        return {
          feature_key: feature,
          access: usageResult.allowed,
          reason:
            usageResult.reason === "within_limit" || usageResult.reason === "unlimited"
              ? "allowed"
              : usageResult.reason === "limit_reached"
              ? "limit_reached"
              : "upgrade_nudge",
          remaining_uses: usageResult.remaining === -1 ? undefined : usageResult.remaining,
        };
      } catch {
        return { feature_key: feature, access: false, reason: "locked" };
      }
    },
    [user?.id, subscriptionTier]
  );

  const useFeature = useCallback(
    async (feature: string): Promise<{ success: boolean; message?: string }> => {
      if (!user?.id) return { success: false, message: "User not authenticated" };
      try {
        const periodType = getFeaturePeriodType(feature);
        const actualPeriodType =
          feature === FEATURE_KEYS.SHIFTBUDDY_CHAT && subscriptionTier === "free"
            ? "weekly"
            : periodType;
        const result = await UsageTracker.useFeature(user.id, feature, actualPeriodType);
        if (!result.success) {
          return { success: false, message: "Usage limit reached or feature not allowed." };
        }
        return { success: true };
      } catch {
        return { success: false, message: "Error accessing feature" };
      }
    },
    [user?.id, subscriptionTier]
  );

  const getFeatureLimits = useCallback((): FeatureLimits => {
    switch (subscriptionTier) {
      case "elite":  return { shift_history_days: -1, dynamic_heatmap_days: -1 };
      case "pro":    return { shift_history_days: 90, dynamic_heatmap_days: 90 };
      case "basic":  return { shift_history_days: 30, dynamic_heatmap_days: 30 };
      default:       return { shift_history_days: 7, dynamic_heatmap_days: 0 };
    }
  }, [subscriptionTier]);

  useEffect(() => {
    setInitialCheckDone(false);
    if (user && session) {
      checkSubscription(false);
      const safetyTimer = setTimeout(() => setInitialCheckDone(true), 2000);
      return () => clearTimeout(safetyTimer);
    } else {
      setSubscribed(false);
      setSubscriptionTier("free");
      setSubscriptionEnd(null);
      setInitialCheckDone(true);
    }
  }, [user?.id]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscribed,
        subscriptionTier,
        subscriptionEnd,
        isLoading,
        initialCheckDone,
        isTrialing,
        trialDaysLeft,
        trialExpired,
        trialEnd,
        checkSubscription,
        purchaseSubscription,
        restorePurchases,
        openCustomerPortal,
        hasFeature,
        canAccessFeature,
        checkFeatureAccess,
        useFeature,
        getFeatureLimits,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return context;
}
