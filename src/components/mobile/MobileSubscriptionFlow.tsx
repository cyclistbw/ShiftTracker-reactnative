// 🚩 FLAG: lucide-react → lucide-react-native
// 🚩 FLAG: <div>/<span>/<ul>/<li> → <View>/<Text>
// 🚩 FLAG: Capacitor.isNativePlatform() / useMobileFeatures → Platform.OS !== 'web' (always native in RN)
// 🚩 FLAG: onClick → onPress
// 🚩 FLAG: md:grid-cols-3 grid layout → <ScrollView> with stacked cards (single column on mobile)
import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink, CheckCircle, AlertCircle, Lock, Zap, Crown, Clock,
  MapPin, Calendar, BarChart3, Target, TrendingUp, Lightbulb, Users,
  FileText, Star,
} from 'lucide-react-native';

const MobileSubscriptionFlow = () => {
  const {
    subscribed,
    subscriptionTier,
    isLoading,
    checkSubscription,
    createCheckoutSession
  } = useSubscription();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const checkAndUpdateStatus = async () => {
      await checkSubscription();
      setLastChecked(new Date());
    };
    checkAndUpdateStatus();
  }, [checkSubscription]);

  const handleUpgradeSubscription = async (tier: 'pro' | 'elite') => {
    const priceIds = {
      pro: 'price_1RlsgT06hf9LhstgsnkDTSZG',
      elite: 'price_1Rlsh906hf9LhstgIbATIaAq'
    };
    await createCheckoutSession(priceIds[tier], tier);
  };

  const refreshSubscriptionStatus = async () => {
    await checkSubscription();
    setLastChecked(new Date());
  };

  return (
    <ScrollView className="flex-1">
      <View className="space-y-6 p-4">
        {/* Header */}
        <View className="items-center space-y-2">
          <Text className="text-2xl font-bold text-foreground">Choose Your Plan</Text>
          <Text className="text-muted-foreground text-sm text-center">
            Unlock your earning potential with advanced analytics and AI coaching
          </Text>
        </View>

        {/* Current Status Card */}
        {subscribed && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CheckCircle size={20} color="#166534" />
                  <Text className="text-green-800 font-semibold ml-2">Active Subscription</Text>
                </View>
                <Badge variant="outline" className={
                  subscriptionTier === 'elite'
                    ? 'bg-purple-100'
                    : subscriptionTier === 'pro'
                      ? 'bg-blue-100'
                      : 'bg-green-100'
                }>
                  {subscriptionTier === 'elite' ? 'Elite' : subscriptionTier === 'pro' ? 'Pro' : 'Basic'}
                </Badge>
              </View>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-green-700">All premium features unlocked</Text>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  onPress={refreshSubscriptionStatus}
                >
                  Refresh
                </Button>
              </View>
              {lastChecked && (
                <Text className="text-xs text-green-600 mt-2">
                  Last verified: {lastChecked.toLocaleTimeString()}
                </Text>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans — stacked single column (mobile-only layout) */}
        {/* 🚩 FLAG: md:grid-cols-3 → stacked ScrollView cards */}
        <PricingCard
          title="Free"
          price="$0"
          period="forever"
          description="Get started with basic tracking"
          isActive={!subscribed}
          isCurrent={!subscribed}
          onSelect={() => {}}
          features={[
            { text: "Track hours, income, mileage", icon: Clock, included: true },
            { text: "Weekly and daily shift summaries", icon: Calendar, included: true },
            { text: "Set and view income goals", icon: Target, included: true },
            { text: "ShiftBuddy AI (10 chats/month)", icon: Lightbulb, included: true },
            { text: "Shift history: 7-day rolling window", icon: BarChart3, included: true },
            { text: "Heatmap data: 7-day rolling window only", icon: MapPin, included: true },
            { text: "Burnout Detection", icon: AlertCircle, included: true },
            { text: "Platform Comparison Analytics", icon: TrendingUp, included: false },
            { text: "Custom time blocks", icon: Clock, included: false },
            { text: "Smart shift alerts", icon: AlertCircle, included: false },
            { text: "Extended history", icon: Calendar, included: false },
            { text: "Full heatmap data", icon: MapPin, included: false },
            { text: "Unlimited AI chats", icon: Lightbulb, included: false },
            { text: "Advanced analytics", icon: BarChart3, included: false }
          ]}
          ctaText="Get Started Free"
          disabled={true}
        />

        <PricingCard
          title="Pro"
          price="$6.99"
          period="per month"
          description="Optimized shifts + smart feedback + earnings growth"
          isActive={subscriptionTier !== 'pro'}
          isCurrent={subscriptionTier === 'pro'}
          onSelect={() => handleUpgradeSubscription('pro')}
          features={[
            { text: "Add & Track Shifts", icon: CheckCircle, included: true },
            { text: "Mileage & Time Tracking", icon: MapPin, included: true },
            { text: "Tax Tools & Deductions", icon: FileText, included: true },
            { text: "Daily Snapshot", icon: Calendar, included: true },
            { text: "Weekly Snapshot", icon: BarChart3, included: true },
            { text: "Income Analytics", icon: TrendingUp, included: true },
            { text: "Seasonal Earnings", icon: Calendar, included: true },
            { text: "Platform Comparison Analytics", icon: TrendingUp, included: true },
            { text: "Dynamic Earnings Heatmap (90-day window)", icon: MapPin, included: true },
            { text: "Recommendations (90-day data only)", icon: Lightbulb, included: true },
            { text: "ShiftBuddy AI (5 calls/day)", icon: Star, included: true },
            { text: "Shift History (90 days)", icon: Calendar, included: true },
            { text: "Burnout Detection", icon: AlertCircle, included: true },
            { text: "Coaching", icon: Users, included: true },
            { text: "Unlimited Historical Data Access", icon: Calendar, included: false },
            { text: "Custom Recommendations Filtering", icon: Lightbulb, included: false },
            { text: "Unlimited AI Calls", icon: Star, included: false },
            { text: "Extended Shift History (365+ days)", icon: Calendar, included: false },
            { text: "Priority Support", icon: Users, included: false }
          ]}
          ctaText="Start Pro Trial"
        />

        <PricingCard
          title="Elite"
          price="$9.99"
          period="per month"
          description="For hardcore earners and serious business optimization"
          isActive={subscriptionTier !== 'elite'}
          isCurrent={subscriptionTier === 'elite'}
          isPopular={true}
          onSelect={() => handleUpgradeSubscription('elite')}
          features={[
            { text: "Everything in Pro, plus:", icon: CheckCircle, included: true },
            { text: "Unlimited Historical Data Access", icon: Calendar, included: true },
            { text: "Custom Recommendations Filtering", icon: Lightbulb, included: true },
            { text: "All Data / Year to Date / Quarter / Custom ranges", icon: BarChart3, included: true },
            { text: "Unlimited AI Calls", icon: Star, included: true },
            { text: "Extended Shift History (365+ days)", icon: Calendar, included: true },
            { text: "Dynamic Heatmap (unlimited historical)", icon: MapPin, included: true },
            { text: "Zone-level recommendations", icon: MapPin, included: true },
            { text: "Predictive earnings planner", icon: Target, included: true },
            { text: "AI-powered Shift Efficiency Score", icon: Star, included: true },
            { text: "Export data for taxes & analysis", icon: FileText, included: true },
            { text: "Priority Support", icon: Users, included: true },
            { text: "Early access to new features", icon: Zap, included: true }
          ]}
          ctaText="Start Elite Trial"
        />

        {/* Trial Info */}
        <View className="items-center space-y-2 pt-4">
          <Text className="text-xs text-muted-foreground">All plans include a 14-day free trial</Text>
          <Text className="text-xs text-muted-foreground">Cancel anytime, no questions asked</Text>
        </View>

        {/* Native App Notice — always shown in RN */}
        {/* 🚩 FLAG: features.isNative check → always true in RN */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <View className="flex-row items-start">
              <AlertCircle size={20} color="#6b7280" />
              <Text className="text-xs text-muted-foreground ml-2 flex-1">
                Subscription management is handled through our secure payment system.
                You'll be redirected to your device's web browser to complete the process.
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
};

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  description: string;
  features: Array<{
    text: string;
    icon: any;
    included: boolean;
  }>;
  ctaText: string;
  onSelect: () => void;
  isActive?: boolean;
  isCurrent?: boolean;
  isPopular?: boolean;
  disabled?: boolean;
}

const PricingCard = ({
  title,
  price,
  period,
  description,
  features,
  ctaText,
  onSelect,
  isActive = true,
  isCurrent = false,
  isPopular = false,
  disabled = false
}: PricingCardProps) => {
  const getCardClass = () => {
    if (isCurrent) return "border-green-200 bg-green-50";
    if (isPopular) return "border-lime-200";
    return "border-border";
  };

  const getTitleIcon = () => {
    if (title === "Elite") return Crown;
    if (title === "Pro") return Zap;
    if (title === "Basic") return BarChart3;
    return null;
  };

  const TitleIconComponent = getTitleIcon();

  return (
    <Card className={getCardClass()}>
      {/* 🚩 FLAG: absolute positioned badge → simple View above card content */}
      {isPopular && (
        <View className="items-center -mt-3 mb-1">
          <Badge className="bg-lime-500">Most Popular</Badge>
        </View>
      )}

      <CardHeader className="items-center pb-2">
        <View className="flex-row items-center space-x-2">
          {TitleIconComponent && <TitleIconComponent size={20} color="#374151" />}
          <CardTitle>{title}</CardTitle>
        </View>
        <View className="items-center space-y-1 mt-1">
          <View className="flex-row items-baseline">
            <Text className="text-3xl font-bold text-foreground">{price}</Text>
            <Text className="text-sm text-muted-foreground">/{period}</Text>
          </View>
          <CardDescription className="text-xs text-center">{description}</CardDescription>
        </View>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Features List */}
        <View className="space-y-2">
          {features.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <View key={index} className="flex-row items-start space-x-2">
                <FeatureIcon
                  size={12}
                  color={feature.included ? '#22c55e' : '#9ca3af'}
                />
                <Text className={`text-xs flex-1 ${feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                  {feature.text}
                </Text>
              </View>
            );
          })}
        </View>

        {/* CTA Button */}
        <Button
          className={`w-full ${
            isCurrent
              ? 'bg-green-600'
              : isPopular
                ? 'bg-lime-600'
                : ''
          }`}
          onPress={onSelect}
          disabled={disabled || isCurrent}
          variant={isCurrent ? "outline" : "default"}
        >
          <View className="flex-row items-center">
            <Text>{isCurrent ? "Current Plan" : ctaText}</Text>
            {!isCurrent && !disabled && <ExternalLink size={12} color="#ffffff" style={{ marginLeft: 8 }} />}
          </View>
        </Button>
      </CardContent>
    </Card>
  );
};

export default MobileSubscriptionFlow;
