/**
 * SubscriptionContext — RN version.
 * Replaces: localStorage → AsyncStorage, window.open → Linking.openURL
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { UsageTracker, FEATURE_KEYS, getFeaturePeriodType } from "@/lib/usage-tracking";

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
  shift_history_days: number; // -1 = unlimited
}

type SubscriptionContextType = {
  subscribed: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionEnd: string | null;
  isLoading: boolean;
  checkSubscription: (forceRefresh?: boolean) => Promise<void>;
  createCheckoutSession: (priceId: string, tier: SubscriptionTier) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
  checkFeatureAccess: (feature: string, currentUsage?: number) => Promise<FeatureAccessResult>;
  useFeature: (feature: string) => Promise<{ success: boolean; message?: string }>;
  getFeatureLimits: () => FeatureLimits;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const checkSubscription = useCallback(
    async (forceRefresh = false) => {
      if (!user || !session) {
        setSubscribed(false);
        setSubscriptionTier("free");
        setSubscriptionEnd(null);
        return;
      }

      if (!forceRefresh) {
        const cached = await AsyncStorage.getItem("subscription_status");
        if (cached) {
          const data = JSON.parse(cached);
          const age = Date.now() - new Date(data.lastVerified || 0).getTime();
          if (age < 2 * 60 * 60 * 1000 && data.userId === user.id) {
            setSubscribed(data.subscribed || false);
            setSubscriptionTier(data.tier || "free");
            setSubscriptionEnd(data.end || null);
            return;
          }
        }
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) throw error;
        setSubscribed(data.subscribed || false);
        setSubscriptionTier(data.subscription_tier || "free");
        setSubscriptionEnd(data.subscription_end || null);
        await cacheSubscriptionData({
          subscribed: data.subscribed || false,
          tier: data.subscription_tier || "free",
          end: data.subscription_end || null,
        });
      } catch (error) {
        console.error("Subscription check failed:", error);
        setSubscribed(false);
        setSubscriptionTier("free");
      } finally {
        setIsLoading(false);
      }
    },
    [user, session, cacheSubscriptionData]
  );

  const createCheckoutSession = useCallback(
    async (priceId: string, tier: SubscriptionTier) => {
      if (!user || !session) return;
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { priceId, tier },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error || !data?.url) throw error || new Error("No URL returned");
        // Open Stripe in external browser — replaces window.open(url, '_system')
        await Linking.openURL(data.url);
      } catch (error) {
        console.error("Checkout creation failed:", error);
      }
    },
    [user, session]
  );

  const openCustomerPortal = useCallback(async () => {
    if (!user || !session) return;
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || !data?.url) throw error || new Error("No URL returned");
      await Linking.openURL(data.url);
    } catch (error) {
      console.error("Customer portal failed:", error);
    }
  }, [user, session]);

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
      case "elite": return { shift_history_days: -1 };
      case "pro":   return { shift_history_days: 90 };
      case "basic": return { shift_history_days: 30 };
      default:      return { shift_history_days: 7 };
    }
  }, [subscriptionTier]);

  useEffect(() => {
    if (user && session) {
      checkSubscription(true);
    } else {
      setSubscribed(false);
      setSubscriptionTier("free");
      setSubscriptionEnd(null);
    }
  }, [user?.id]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscribed,
        subscriptionTier,
        subscriptionEnd,
        isLoading,
        checkSubscription,
        createCheckoutSession,
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
