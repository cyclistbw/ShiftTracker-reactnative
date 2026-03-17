// 🚩 FLAG: useNavigate → useNavigation; <div> → <View>; <span> → <Text>
// 🚩 FLAG: Capacitor.isNativePlatform() → always true in RN (removed import)
import { ReactNode } from "react";
import { View, Text } from "react-native";
import { useSubscription } from "@/context/SubscriptionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Zap, Crown, ExternalLink } from "lucide-react-native";

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
  const { canAccessFeature, createCheckoutSession } = useSubscription();

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
