// 🚩 FLAG: lucide-react → lucide-react-native
// 🚩 FLAG: toast from sonner → toast from @/hooks/use-toast
// 🚩 FLAG: <div>/<span>/<ul>/<li>/<button> → <View>/<Text>/<Pressable>
// 🚩 FLAG: localStorage → AsyncStorage
// 🚩 FLAG: window.location.href → navigation.navigate (via AuthContext signOut redirect)
// 🚩 FLAG: useTheme from next-themes → Appearance.getColorScheme() / no-op (theme handled by NativeWind config)
// 🚩 FLAG: Dialog → Modal (for subscription upgrade)
// 🚩 FLAG: AlertDialog → native Alert.alert() for delete confirmation
// 🚩 FLAG: onClick → onPress
// 🚩 FLAG: sm:flex-row → flex-col (single column on mobile)
// 🚩 FLAG: hover:bg-muted → removed (no hover on mobile)
import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Modal, Alert as RNAlert, TouchableWithoutFeedback } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useContentMode } from "@/context/ContentModeContext";
import { useTheme } from "@/context/ThemeContext";
import { Heart, Crown, Zap, ExternalLink, Moon, Sun, EyeOff, LogOut, User, Eye, Trash2, BarChart3 } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import MobileSubscriptionFlow from "@/components/mobile/MobileSubscriptionFlow";

const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

const SHOW_EMAIL_KEY = 'showEmail';

const PersonalSettings = () => {
  const { user, signOut } = useAuth();
  const { setThemeMode, isDark } = useTheme();
  const { settings, loading, saveSettings } = useBusinessSettings();
  const { subscriptionTier, subscribed, subscriptionEnd, openCustomerPortal, isLoading, hasFeature } = useSubscription();
  const { preferences, loading: preferencesLoading, updateContentMode, refreshPreferences } = useUserPreferences();
  const { setContentMode } = useContentMode();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  // 🚩 FLAG: localStorage.getItem → AsyncStorage (initialized async via useEffect)
  const [showEmail, setShowEmail] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const [formData, setFormData] = useState({
    timezone: "America/New_York",
    clockFormat: "12-hour" as '12-hour' | '24-hour',
    darkModePreference: false,
    contentModeEnabled: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // 🚩 FLAG: Load showEmail from AsyncStorage instead of localStorage
  useEffect(() => {
    AsyncStorage.getItem(SHOW_EMAIL_KEY).then((val) => {
      if (val !== null) setShowEmail(JSON.parse(val));
    });
  }, []);

  useEffect(() => {
    if (settings && preferences && !loading && !preferencesLoading) {
      const isDark = settings.darkModePreference === 'dark';
      setFormData({
        timezone: settings.timezone || "America/New_York",
        clockFormat: settings.clockFormat || "12-hour",
        darkModePreference: isDark,
        contentModeEnabled: preferences.content_mode_enabled || false,
      });
      // Sync ThemeContext with the DB-persisted preference (authoritative source on login)
      setThemeMode(isDark ? 'dark' : 'light');
      setHasChanges(false);
    }
  }, [settings, preferences, loading, preferencesLoading]);

  // 🚩 FLAG: localStorage.setItem → AsyncStorage.setItem
  useEffect(() => {
    AsyncStorage.setItem(SHOW_EMAIL_KEY, JSON.stringify(showEmail));
  }, [showEmail]);

  const handleSave = useCallback(async () => {
    if (!settings || !hasChanges) return;
    setIsSaving(true);

    const updatedSettings = {
      ...settings,
      timezone: formData.timezone,
      clockFormat: formData.clockFormat,
      darkModePreference: formData.darkModePreference ? 'dark' : 'light' as 'light' | 'dark' | 'system',
    };

    const [settingsSuccess, contentModeSuccess] = await Promise.all([
      saveSettings(updatedSettings),
      updateContentMode(formData.contentModeEnabled),
    ]);

    if (settingsSuccess && contentModeSuccess) {
      setThemeMode(formData.darkModePreference ? 'dark' : 'light');
      refreshPreferences();
      setContentMode(formData.contentModeEnabled);
      setHasChanges(false);
    } else if (!settingsSuccess || !contentModeSuccess) {
      toast({ title: 'Failed to save some settings', variant: 'destructive' });
    }
    setIsSaving(false);
  }, [settings, formData, hasChanges, saveSettings, updateContentMode, refreshPreferences, setContentMode, setThemeMode]);

  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      toast({ title: 'Failed to open subscription management', variant: 'destructive' });
    }
  };

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      console.log('PersonalSettings: Starting logout process');
      await signOut();
      console.log('PersonalSettings: Logout completed successfully');
      toast({ title: "Logged out successfully" });
    } catch (error) {
      console.error('PersonalSettings: Logout failed:', error);
      toast({ title: "Failed to log out", variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
    }
  }, [signOut, isLoggingOut]);

  const handleDeleteAccount = useCallback(async () => {
    if (isDeletingAccount) return;
    try {
      setIsDeletingAccount(true);
      console.log('PersonalSettings: Starting account deletion');

      const { data, error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 🚩 FLAG: localStorage.clear() → AsyncStorage.clear()
      await AsyncStorage.clear();
      // 🚩 FLAG: window.location.href → signOut() which triggers navigation reset via AuthContext
      await signOut();
      toast({ title: "Account deleted successfully" });
    } catch (error) {
      console.error('PersonalSettings: Account deletion failed:', error);
      toast({ title: "Failed to delete account. Please try again.", variant: "destructive" });
    } finally {
      setIsDeletingAccount(false);
    }
  }, [isDeletingAccount, signOut]);

  // 🚩 FLAG: AlertDialogTrigger → RNAlert.alert() native confirmation dialog
  const confirmDeleteAccount = () => {
    RNAlert.alert(
      "Are you sure you want to delete your account?",
      "This action cannot be undone. This will permanently delete your account and remove all of your data from our servers, including shifts, expenses, analytics, and settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, delete my account",
          style: "destructive",
          onPress: handleDeleteAccount,
        },
      ]
    );
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'pro': return { icon: Zap, color: isDark ? '#60a5fa' : '#2563eb', bgColor: isDark ? '#1e3a5f' : '#eff6ff' };
      case 'elite': return { icon: Crown, color: isDark ? '#c084fc' : '#7c3aed', bgColor: isDark ? '#2e1a47' : '#f5f3ff' };
      default: return { icon: Heart, color: isDark ? '#94a3b8' : '#6b7280', bgColor: isDark ? '#1e293b' : '#f9fafb' };
    }
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    return `${'*'.repeat(username.length)}@${domain}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <View className="items-center justify-center p-8">
            <Text className="text-sm text-muted-foreground">Loading personal settings...</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <View className="items-center justify-center p-8">
            <Text className="text-sm text-muted-foreground">Please log in to manage your personal settings.</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <View className="items-center justify-center p-8">
            <Text className="text-sm text-muted-foreground">Failed to load personal settings.</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  const tierInfo = getTierInfo(subscriptionTier);
  const TierIcon = tierInfo.icon;

  console.log('Subscription tier:', subscriptionTier, 'Subscribed:', subscribed);

  return (
    <>
      {/* 🚩 FLAG: Dialog → Modal for subscription upgrade flow */}
      <Modal
        visible={showSubscriptionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSubscriptionModal(false)}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-background rounded-t-2xl max-h-[90%]">
                <View className="p-4 border-b border-border flex-row justify-between items-center">
                  <Text className="text-lg font-semibold text-foreground">Upgrade Plan</Text>
                  <Button variant="ghost" size="sm" onPress={() => setShowSubscriptionModal(false)}>
                    Close
                  </Button>
                </View>
                <MobileSubscriptionFlow />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Card>
        <CardContent className="pt-6">
          {/* Header */}
          {/* 🚩 FLAG: sm:flex-row → flex-col on mobile */}
          <View className="flex-col gap-4 mb-6">
            <View>
              <Text className="text-xl font-semibold text-foreground">Personal Settings</Text>
              <Text className="text-muted-foreground text-sm mt-1">Manage your personal preferences and wellness settings</Text>
            </View>
            <View className="flex-row gap-2">
              {/* 🚩 FLAG: AlertDialog → RNAlert.alert() confirmation */}
              <Button
                variant="outline"
                size="sm"
                className="flex-row items-center gap-2 border-destructive"
                onPress={confirmDeleteAccount}
                disabled={isDeletingAccount}
              >
                <Trash2 size={16} color="#dc2626" />
                <Text className="text-destructive text-sm">
                  {isDeletingAccount ? "Deleting..." : "Delete Account"}
                </Text>
              </Button>
              <Button
                onPress={handleLogout}
                disabled={isLoggingOut}
                variant="destructive"
                size="sm"
                className="flex-row items-center gap-2"
              >
                <LogOut size={16} color="#ffffff" />
                <Text className="text-white text-sm">
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </Text>
              </Button>
            </View>
          </View>

          {/* Subscription Section */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-medium text-foreground">Plan & Subscription</Text>
              {user?.email && (
                <View className="flex-row items-center">
                  <User size={16} color={isDark ? '#94a3b8' : '#6b7280'} />
                  <Text className="text-sm text-muted-foreground ml-1 mr-2">
                    {showEmail ? user.email : maskEmail(user.email)}
                  </Text>
                  {/* 🚩 FLAG: <button> → <Pressable> */}
                  <Pressable onPress={() => setShowEmail(!showEmail)} className="p-1">
                    {showEmail ? <EyeOff size={12} color={isDark ? '#94a3b8' : '#6b7280'} /> : <Eye size={12} color={isDark ? '#94a3b8' : '#6b7280'} />}
                  </Pressable>
                </View>
              )}
            </View>

            <View className="p-4 rounded-lg border border-border" style={{ backgroundColor: tierInfo.bgColor }}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <TierIcon size={20} color={tierInfo.color} />
                  <Text className="font-medium text-foreground capitalize">{subscriptionTier} Plan</Text>
                  <Badge variant={subscribed ? "default" : "secondary"}>
                    {subscribed ? "Active" : "Free"}
                  </Badge>
                </View>
                {subscribed && subscriptionEnd && (
                  <Text className="text-sm text-muted-foreground">
                    Expires: {new Date(subscriptionEnd).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <View className="space-y-1 mb-4">
                {subscriptionTier === 'free' && [
                  "Track hours, income, mileage",
                  "Weekly and daily shift summaries",
                  "Limited ShiftBuddy access",
                  "Previous 7 days of shift data",
                ].map((item, i) => (
                  <Text key={i} className="text-sm text-foreground">• {item}</Text>
                ))}
                {subscriptionTier === 'pro' && [
                  "Full access to ShiftBuddy AI",
                  "Full Earnings Heatmap",
                  "Seasonal Earnings Analysis",
                  "Goal-based recommendations",
                  "Mood tracking & check-ins",
                ].map((item, i) => (
                  <Text key={i} className="text-sm text-foreground">• {item}</Text>
                ))}
                {subscriptionTier === 'elite' && [
                  "Zone-level recommendations",
                  "Predictive earnings planner",
                  "AI-powered Shift Efficiency Score",
                  "Export data for taxes & analysis",
                  "Priority support",
                ].map((item, i) => (
                  <Text key={i} className="text-sm text-foreground">• {item}</Text>
                ))}
              </View>

              <View className="flex-row gap-2">
                {subscribed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={handleManageSubscription}
                    disabled={isLoading}
                    className="flex-row items-center gap-2"
                  >
                    <ExternalLink size={16} color={isDark ? '#94a3b8' : '#374151'} />
                    <Text className="text-foreground">{isLoading ? 'Loading...' : 'Manage Subscription'}</Text>
                  </Button>
                ) : (
                  // 🚩 FLAG: Dialog + DialogTrigger → Button opens Modal
                  <Button
                    size="sm"
                    onPress={() => setShowSubscriptionModal(true)}
                    className="flex-row items-center gap-2"
                  >
                    <Zap size={16} color="#ffffff" />
                    <Text className="text-white">Upgrade Plan</Text>
                  </Button>
                )}
              </View>
            </View>
          </View>

          <Separator className="my-6" />

          <View className="space-y-6">
            {/* Wellness Check-In */}
            {hasFeature('wellness_checkin') && (
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <Heart size={16} color="#6b7280" />
                    <Label>Enable Wellness Check-In</Label>
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    Require mood, energy, and stress tracking after each shift to monitor your emotional wellness and prevent burnout.
                  </Text>
                </View>
                <Switch
                  checked={formData.enableWellnessCheckin}
                  onCheckedChange={(checked) => updateFormData('enableWellnessCheckin', checked)}
                />
              </View>
            )}

            {/* Content Mode */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <EyeOff size={16} color="#6b7280" />
                  <Label>Enable Content Mode</Label>
                </View>
                <Text className="text-sm text-muted-foreground">
                  Hide income amounts across all pages for privacy or content creation.
                </Text>
              </View>
              <Switch
                checked={formData.contentModeEnabled}
                onCheckedChange={(checked) => updateFormData('contentModeEnabled', checked)}
                disabled={preferencesLoading}
              />
            </View>

            {/* Dark Mode — 🚩 FLAG: next-themes setTheme removed; toggle saves preference to DB only */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <View className="flex-row items-center gap-2 mb-1">
                  {formData.darkModePreference ? (
                    <Moon size={16} color="#6b7280" />
                  ) : (
                    <Sun size={16} color="#6b7280" />
                  )}
                  <Label>Enable Dark Mode</Label>
                </View>
                <Text className="text-sm text-muted-foreground">
                  Toggle between light and dark theme appearance.
                </Text>
              </View>
              <Switch
                checked={formData.darkModePreference}
                onCheckedChange={(checked) => {
                  updateFormData('darkModePreference', checked);
                }}
              />
            </View>

            {/* Timezone */}
            <View>
              <Label className="mb-1">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => updateFormData('timezone', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Text className="text-sm text-muted-foreground mt-1">
                This timezone will be used for all time-based calculations and reports in the app.
              </Text>
            </View>

            {/* Clock Format */}
            <View>
              <Label className="mb-1">Clock Format</Label>
              <Select
                value={formData.clockFormat}
                onValueChange={(value: '12-hour' | '24-hour') => updateFormData('clockFormat', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select clock format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12-hour">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24-hour">24-hour (Military)</SelectItem>
                </SelectContent>
              </Select>
              <Text className="text-sm text-muted-foreground mt-1">
                Choose how time is displayed throughout the app.
              </Text>
            </View>

            <Button
              onPress={handleSave}
              disabled={isSaving || !hasChanges}
              className="mt-2"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </View>
        </CardContent>
      </Card>
    </>
  );
};

export default PersonalSettings;
