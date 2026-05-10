// 🚩 FLAG: lucide-react → lucide-react-native
// 🚩 FLAG: <div>/<span>/<ul>/<li> → <View>/<Text>
// 🚩 FLAG: onClick → onPress
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const RC_WEB_BILLING_URL = 'https://pay.rev.cat/crejzhnbemgrbtno';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, AlertCircle, Crown, Clock,
  MapPin, Calendar, BarChart3, Target, TrendingUp, Lightbulb,
  FileText, Star, Zap, Users,
} from 'lucide-react-native';


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
    purchaseSubscription,
    restorePurchases,
  } = useSubscription();
  const { user } = useAuth();
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    checkSubscription().then(() => setLastChecked(new Date()));
  }, [checkSubscription]);

  const handleUpgrade = async () => {
    if (Platform.OS === 'web') {
      const url = user?.id
        ? `${RC_WEB_BILLING_URL}?app_user_id=${encodeURIComponent(user.id)}`
        : RC_WEB_BILLING_URL;
      Linking.openURL(url);
      return;
    }
    await purchaseSubscription(selectedBilling);
  };

  const refreshStatus = async () => {
    await checkSubscription();
    setLastChecked(new Date());
  };

  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isElite = subscriptionTier === 'elite';
  const inactiveToggleText = isDark ? '#e5e7eb' : '#374151';
  const toggleBg = isDark ? '#1f2937' : '#f3f4f6';

  return (
    <ScrollView className="flex-1" contentContainerStyle={Platform.OS === 'web' ? { alignItems: 'center' } : undefined}>
      <View style={[{ gap: 20, padding: 16 }, Platform.OS === 'web' && { width: '100%', maxWidth: 768 }]}>
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
              <Text className="text-foreground">Current Free Plan</Text>
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
              <Crown size={20} color="#65a30d" />
              <CardTitle>ShiftTracker Elite</CardTitle>
            </View>
          </CardHeader>

          <CardContent style={{ gap: 16 }}>
            {/* Billing toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: toggleBg, borderRadius: 8, padding: 4, gap: 4 }}>
              <Button
                variant={selectedBilling === 'monthly' ? 'default' : 'ghost'}
                style={{ flex: 1 }}
                onPress={() => setSelectedBilling('monthly')}
              >
                <Text style={{ color: selectedBilling === 'monthly' ? '#fff' : inactiveToggleText, fontSize: 13, fontWeight: '600' }}>
                  Monthly
                </Text>
              </Button>
              <Button
                variant={selectedBilling === 'annual' ? 'default' : 'ghost'}
                style={{ flex: 1 }}
                onPress={() => setSelectedBilling('annual')}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: selectedBilling === 'annual' ? '#fff' : inactiveToggleText, fontSize: 13, fontWeight: '600' }}>
                    Annual
                  </Text>
                  <Text style={{ color: selectedBilling === 'annual' ? '#d9f99d' : '#65a30d', fontSize: 10 }}>
                    Save 20%
                  </Text>
                </View>
              </Button>
            </View>

            {/* Price display */}
            <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 8 }}>
              {selectedBilling === 'monthly' ? (
                <>
                  <Text className="text-3xl font-bold text-foreground">$12.99</Text>
                  <Text className="text-sm text-muted-foreground">per month</Text>
                </>
              ) : (
                <>
                  <Text className="text-3xl font-bold text-foreground">$99.99</Text>
                  <Text className="text-sm text-muted-foreground">per year ($8.33/mo)</Text>
                </>
              )}
            </View>

            {/* Features */}
            <View style={{ gap: 8, marginTop: 16, marginBottom: 20 }}>
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

            <Text className="text-xs text-muted-foreground text-center" style={{ marginTop: 8 }}>
              7-day free trial · Cancel anytime
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20 }}>
              <TouchableOpacity onPress={() => Linking.openURL('https://shifttrackerapp.com/privacy-policy')}>
                <Text style={{ color: '#6b7280', fontSize: 11, textDecorationLine: 'underline' }}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('https://shifttrackerapp.com/terms-of-service')}>
                <Text style={{ color: '#6b7280', fontSize: 11, textDecorationLine: 'underline' }}>Terms of Use</Text>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>

        {/* Restore Purchases — required by Apple guideline 3.1.1 */}
        {!isElite && Platform.OS === 'ios' && (
          <Button variant="ghost" onPress={restorePurchases} disabled={isLoading}>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>Restore Purchases</Text>
          </Button>
        )}

        <Text style={{ color: '#9ca3af', fontSize: 11, textAlign: 'center', paddingHorizontal: 24, paddingBottom: insets.bottom + 12 }}>
          {Platform.OS === 'ios'
            ? 'Subscriptions are managed through Apple. Payment will be charged to your account at confirmation. Cancel anytime in your device’s subscription settings.'
            : 'Subscriptions are managed through Google. Payment will be charged to your account at confirmation. Cancel anytime in your device’s subscription settings.'}
        </Text>
      </View>
    </ScrollView>
  );
};

export default MobileSubscriptionFlow;
