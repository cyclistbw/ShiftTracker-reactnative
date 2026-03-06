// 🚩 FLAG: useNavigate → useNavigation; <div> → <View>; <span> → <Text>
// 🚩 FLAG: Capacitor.isNativePlatform() → always true in RN (removed import)
import { ReactNode } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useSubscription } from "@/context/SubscriptionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Zap, Crown, ExternalLink, Clock } from "lucide-react-native";
import { useShiftBuddyTrial } from "@/hooks/useShiftBuddyTrial";

type FeatureGateProps = {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  requiredTier?: "pro" | "elite";
  title?: string;
  description?: string;
};

export function FeatureGate({
  feature,
  children,
  fallback,
  requiredTier = "pro",
  title,
  description,
}: FeatureGateProps) {
  const { canAccessFeature, subscriptionTier, createCheckoutSession } = useSubscription();
  const { isTrialActive, trialDaysRemaining, trialExpired, isLoading } = useShiftBuddyTrial();

  // Special handling for ShiftBuddy trial
  if (feature === "shiftbuddy" && subscriptionTier === "free") {
    if (isLoading) {
      return (
        <View className="items-center p-4">
          <ActivityIndicator />
          <Text className="text-sm text-muted-foreground mt-2">Loading trial status...</Text>
        </View>
      );
    }

    if (isTrialActive) {
      return (
        <View className="space-y-4">
          <View className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <View className="flex-row items-center gap-2">
              <Clock size={16} color="#c2410c" />
              <Text className="font-medium text-orange-700">
                ShiftBuddy Trial: {trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} remaining
              </Text>
            </View>
            <Text className="text-xs text-orange-600 mt-1">
              Upgrade to Pro to continue using ShiftBuddy after your trial
            </Text>
          </View>
          {children}
        </View>
      );
    }

    if (trialExpired) {
      if (fallback) return <>{fallback}</>;
      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <View className="items-center mb-4">
              <View className="p-3 bg-orange-100 rounded-full">
                <Clock size={24} color="#ea580c" />
              </View>
            </View>
            <CardTitle>Trial Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <Text className="text-muted-foreground text-center mb-4">
              Your 7-day ShiftBuddy trial has ended. Upgrade to Pro to continue using ShiftBuddy and unlock all premium features.
            </Text>
            <Button
              onPress={async () => {
                await createCheckoutSession("price_1RlsgT06hf9LhstgsnkDTSZG", "pro");
              }}
              className="w-full"
              size="lg"
            >
              Upgrade to Pro
            </Button>
            <Text className="text-xs text-muted-foreground text-center mt-2">7-day Trial</Text>
          </CardContent>
        </Card>
      );
    }
  }

  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const tierInfo = {
    pro: { name: "Pro", Icon: Zap, color: "#2563eb" },
    elite: { name: "Elite", Icon: Crown, color: "#9333ea" },
  };

  const priceIds = {
    pro: "price_1RlsgT06hf9LhstgsnkDTSZG",
    elite: "price_1Rlsh906hf9LhstgIbATIaAq",
  };

  const { name, Icon, color } = tierInfo[requiredTier];

  const handleUpgradeClick = async () => {
    await createCheckoutSession(priceIds[requiredTier], requiredTier);
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <View className="items-center mb-2">
          <View className="flex-row items-center gap-2">
            <Lock size={20} color="#6b7280" />
            <Badge variant="outline">
              <View className="flex-row items-center gap-1">
                <Icon size={12} color={color} />
                <Text className="text-xs" style={{ color }}>{name} Feature</Text>
              </View>
            </Badge>
          </View>
        </View>
        {title && <CardTitle>{title}</CardTitle>}
      </CardHeader>
      <CardContent>
        <Text className="text-muted-foreground text-center mb-4">
          {description || `This feature requires a ${name} subscription to unlock.`}
        </Text>
        <View className="space-y-2">
          <Button onPress={handleUpgradeClick} className="w-full">
            Upgrade to {name}
          </Button>
          <Text className="text-xs text-muted-foreground text-center">7-day Trial</Text>
        </View>
      </CardContent>
    </Card>
  );
}

export function ProFeatureGate({ children, ...props }: Omit<FeatureGateProps, "requiredTier">) {
  return <FeatureGate {...props} requiredTier="pro">{children}</FeatureGate>;
}

export function EliteFeatureGate({ children, ...props }: Omit<FeatureGateProps, "requiredTier">) {
  return <FeatureGate {...props} requiredTier="elite">{children}</FeatureGate>;
}
