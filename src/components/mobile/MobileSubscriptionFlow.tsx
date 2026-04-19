// 🚩 FLAG: lucide-react → lucide-react-native
// 🚩 FLAG: <div>/<span>/<ul>/<li> → <View>/<Text>
// 🚩 FLAG: onClick → onPress
import { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSubscription } from '@/context/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, AlertCircle, Crown, Clock,
  MapPin, Calendar, BarChart3, Target, TrendingUp, Lightbulb,
  FileText, Star, Zap, Users,
} from 'lucide-react-native';

const PRICE_IDS = {
  eliteMonthly: 'price_1TDud806hf9LhstgxzZ74Uvo',
  eliteAnnual:  'price_1TDud806hf9LhstgrCYAFuIa',
};

const ELITE_FEATURES = [
  { text: "Add & Track Shifts",                         icon: Clock },
  { text: "Mileage & Time Tracking",                    icon: MapPin },
  { text: "Tax Tools & Deductions",                     icon: FileText },
  { text: "Daily & Weekly Snapshots",                   icon: Calendar },
  { text: "Income Analytics",                           icon: TrendingUp },
  { text: "Seasonal Earnings",                          icon: Calendar },
  { text: "Platform Comparison Analytics",              icon: BarChart3 },
  { text: "Dynamic Earnings Heatmap (unlimited)",       icon: MapPin },
  { text: "Unlimited Historical Data Access",           icon: Calendar },
  { text: "Custom Recommendations Filtering",           icon: Lightbulb },
  { text: "Unlimited AI Calls (ShiftBuddy)",            icon: Star },
  { text: "Extended Shift History (365+ days)",         icon: Calendar },
  { text: "Zone-level Recommendations",                 icon: MapPin },
  { text: "Predictive Earnings Planner",                icon: Target },
  { text: "AI-powered Shift Efficiency Score",          icon: Star },
  { text: "Export Data for Taxes & Analysis",           icon: FileText },
  { text: "Burnout Detection & Coaching",               icon: AlertCircle },
  { text: "Priority Support",                           icon: Users },
  { text: "Early Access to New Features",               icon: Zap },
];

const MobileSubscriptionFlow = () => {
  const {
    subscribed,
    subscriptionTier,
    isLoading,
    checkSubscription,
    createCheckoutSession,
  } = useSubscription();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    checkSubscription().then(() => setLastChecked(new Date()));
  }, [checkSubscription]);

  const handleUpgrade = async () => {
    const priceId = selectedBilling === 'annual' ? PRICE_IDS.eliteAnnual : PRICE_IDS.eliteMonthly;
    await createCheckoutSession(priceId, 'elite');
  };

  const refreshStatus = async () => {
    await checkSubscription();
    setLastChecked(new Date());
  };

  const isElite = subscriptionTier === 'elite';

  return (
    <ScrollView className="flex-1">
      <View style={{ gap: 20, padding: 16 }}>
        {/* Header */}
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text className="text-2xl font-bold text-foreground">Choose Your Plan</Text>
          <Text className="text-muted-foreground text-sm text-center">
            Unlock your full earning potential with ShiftTracker Elite
          </Text>
        </View>

        {/* Active subscription banner */}
        {subscribed && (
          <Card style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
            <CardHeader style={{ paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={20} color="#166534" />
                  <Text style={{ color: '#166534', fontWeight: '600', marginLeft: 8 }}>Active Subscription</Text>
                </View>
                <Badge variant="outline" style={{ backgroundColor: '#d1fae5' }}>
                  {isElite ? 'Elite' : subscriptionTier}
                </Badge>
              </View>
            </CardHeader>
            <CardContent>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#15803d' }}>All premium features unlocked</Text>
                <Button variant="ghost" size="sm" disabled={isLoading} onPress={refreshStatus}>
                  Refresh
                </Button>
              </View>
              {lastChecked && (
                <Text style={{ fontSize: 11, color: '#16a34a', marginTop: 6 }}>
                  Last verified: {lastChecked.toLocaleTimeString()}
                </Text>
              )}
            </CardContent>
          </Card>
        )}

        {/* Free plan */}
        <Card>
          <CardHeader style={{ alignItems: 'center', paddingBottom: 8 }}>
            <CardTitle>Free</CardTitle>
            <View style={{ alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Text className="text-3xl font-bold text-foreground">$0</Text>
              <CardDescription className="text-xs text-center">Basic shift tracking forever</CardDescription>
            </View>
          </CardHeader>
          <CardContent style={{ gap: 12 }}>
            {[
              { text: "Track hours, income & mileage",        icon: Clock },
              { text: "Weekly & daily shift summaries",       icon: Calendar },
              { text: "Set and view income goals",            icon: Target },
              { text: "ShiftBuddy AI (10 chats/month)",       icon: Star },
              { text: "Shift history: 7-day rolling window",  icon: BarChart3 },
              { text: "Burnout Detection",                    icon: AlertCircle },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon size={13} color="#22c55e" />
                  <Text className="text-xs text-foreground flex-1">{f.text}</Text>
                </View>
              );
            })}
            <Button variant="outline" disabled={true} className="w-full mt-2">
              <Text>Current Free Plan</Text>
            </Button>
          </CardContent>
        </Card>

        {/* Elite plan */}
        <Card style={{ borderColor: '#84cc16', borderWidth: 2 }}>
          <View style={{ alignItems: 'center', marginTop: -12, marginBottom: 4 }}>
            <Badge style={{ backgroundColor: '#65a30d' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Most Popular</Text>
            </Badge>
          </View>

          <CardHeader style={{ alignItems: 'center', paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Crown size={20} color="#374151" />
              <CardTitle>ShiftTracker Elite</CardTitle>
            </View>
            <CardDescription className="text-xs text-center mt-1">
              For serious earners — every tool, no limits
            </CardDescription>
          </CardHeader>

          <CardContent style={{ gap: 16 }}>
            {/* Billing toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4, gap: 4 }}>
              <Button
                variant={selectedBilling === 'monthly' ? 'default' : 'ghost'}
                style={{ flex: 1 }}
                onPress={() => setSelectedBilling('monthly')}
              >
                <Text style={{ color: selectedBilling === 'monthly' ? '#fff' : '#374151', fontSize: 13, fontWeight: '600' }}>
                  Monthly
                </Text>
              </Button>
              <Button
                variant={selectedBilling === 'annual' ? 'default' : 'ghost'}
                style={{ flex: 1 }}
                onPress={() => setSelectedBilling('annual')}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: selectedBilling === 'annual' ? '#fff' : '#374151', fontSize: 13, fontWeight: '600' }}>
                    Annual
                  </Text>
                  <Text style={{ color: selectedBilling === 'annual' ? '#d9f99d' : '#65a30d', fontSize: 10 }}>
                    Save 20%
                  </Text>
                </View>
              </Button>
            </View>

            {/* Price display */}
            <View style={{ alignItems: 'center' }}>
              {selectedBilling === 'monthly' ? (
                <>
                  <Text className="text-3xl font-bold text-foreground">$12.97</Text>
                  <Text className="text-sm text-muted-foreground">per month</Text>
                </>
              ) : (
                <>
                  <Text className="text-3xl font-bold text-foreground">$99.97</Text>
                  <Text className="text-sm text-muted-foreground">per year ($8.33/mo)</Text>
                </>
              )}
            </View>

            {/* Features */}
            <View style={{ gap: 8 }}>
              {ELITE_FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon size={13} color="#22c55e" />
                    <Text className="text-xs text-foreground flex-1">{f.text}</Text>
                  </View>
                );
              })}
            </View>

            {/* CTA */}
            {isElite ? (
              <Button variant="outline" disabled className="w-full" style={{ borderColor: '#22c55e' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} color="#16a34a" />
                  <Text style={{ color: '#16a34a', fontWeight: '600' }}>Current Plan</Text>
                </View>
              </Button>
            ) : (
              <Button
                className="w-full"
                style={{ backgroundColor: '#65a30d' }}
                onPress={handleUpgrade}
                disabled={isLoading}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {selectedBilling === 'annual' ? 'Start Elite Annual Trial' : 'Start Elite Monthly Trial'}
                </Text>
              </Button>
            )}

            <Text className="text-xs text-muted-foreground text-center">
              14-day free trial · Cancel anytime
            </Text>
          </CardContent>
        </Card>

        {/* Notice */}
        <Card style={{ backgroundColor: '#f9fafb' }}>
          <CardContent style={{ paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={18} color="#6b7280" />
              <Text className="text-xs text-muted-foreground flex-1">
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

export default MobileSubscriptionFlow;
