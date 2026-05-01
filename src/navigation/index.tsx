/**
 * Root navigation - replaces react-router-dom BrowserRouter + Routes.
 *
 * Three navigator states (mirrors web ProtectedRoute logic):
 *
 *  1. Unauthenticated -> AuthNavigator (AuthStack)
 *       Login . Signup . SignupConfirmation . Onboarding
 *       (Onboarding has no ProtectedRoute in web -- accessible pre-auth)
 *
 *  2. Authenticated + onboarding incomplete -> OnboardingNavigator (OnboardingStack)
 *       Survey . OnboardingSuccess
 *       (web: ProtectedRoute skipOnboardingCheck -> auth required, onboarding check skipped)
 *
 *  3. Authenticated + onboarding complete -> AppNavigator (AppStack)
 *       Tabs: Dashboard . History . TaxReport . Settings
 *       Modals: Analytics . MobileSubscription
 */
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, Clock, FileBarChart, Settings as SettingsIcon } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme, THEME_COLORS } from "@/context/ThemeContext";

const NAV_LIGHT_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: THEME_COLORS.light.background,
    card: THEME_COLORS.light.card,
    text: THEME_COLORS.light.foreground,
    border: THEME_COLORS.light.border,
    primary: THEME_COLORS.light.primary,
  },
};

const NAV_DARK_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: THEME_COLORS.dark.background,
    card: THEME_COLORS.dark.card,
    text: THEME_COLORS.dark.foreground,
    border: THEME_COLORS.dark.border,
    primary: THEME_COLORS.dark.primary,
  },
};
import { supabase } from "@/integrations/supabase/client";
import { isOnboardingConfirmed, setOnboardingConfirmed, hasSeenIntroSlides, registerOnboardingCompleteHandler } from "@/lib/onboarding-state";
import { TrialBanner } from "@/components/TrialBanner";
import { TrialExpiredModal } from "@/components/TrialExpiredModal";
import { linking } from "./linking";

import DashboardScreen from "@/pages/Index";
import HistoryScreen from "@/pages/History";
import TaxReportScreen from "@/pages/TaxReport";
import SettingsScreen from "@/pages/Settings";
import LoginScreen from "@/pages/Login";
import SignupScreen from "@/pages/Signup";
import SignupConfirmationScreen from "@/pages/SignupConfirmation";
import OnboardingScreen from "@/pages/Onboarding";
import SurveyScreen from "@/pages/Survey";
import OnboardingSuccessScreen from "@/pages/OnboardingSuccess";
import AnalyticsScreen from "@/pages/Analytics";
import MobileSubscriptionScreen from "@/pages/MobileSubscription";
import MobilePrivacyScreen from "@/pages/MobilePrivacy";
import MobileTermsScreen from "@/pages/MobileTerms";
import ResetPasswordScreen from "@/pages/ResetPassword";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  SignupConfirmation: undefined;
  Onboarding: undefined;
};

export type OnboardingStackParamList = {
  Survey: undefined;
  OnboardingSuccess: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  History: undefined;
  TaxReport: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Analytics: undefined;
  MobileSubscription: undefined;
  MobilePrivacy: undefined;
  MobileTerms: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <TrialBanner />
      <Tab.Navigator
        id={undefined}
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneStyle: { flex: 1 },
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            height: 56 + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
          },
          tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
          tabBarIcon: ({ color, size }) => {
            const s = size - 2;
            switch (route.name) {
              case "Dashboard":  return <Home size={s} color={color} />;
              case "History":    return <Clock size={s} color={color} />;
              case "TaxReport":  return <FileBarChart size={s} color={color} />;
              case "Settings":   return <SettingsIcon size={s} color={color} />;
            }
          },
        })}
      >
        <Tab.Screen name="Dashboard"  component={DashboardScreen}  options={{ title: "Dashboard" }} />
        <Tab.Screen name="History"    component={HistoryScreen}    options={{ title: "History",  lazy: false }} />
        <Tab.Screen name="TaxReport"  component={TaxReportScreen}  options={{ title: "Tax",      lazy: false }} />
        <Tab.Screen name="Settings"   component={SettingsScreen}   options={{ title: "Settings", lazy: false }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

function AppNavigator() {
  return (
    <>
      {/* Trial expired modal — renders above all app screens via RN Modal */}
      <TrialExpiredModal />
      <AppStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={TabNavigator} />
      <AppStack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ presentation: "modal", headerShown: true, title: "Analytics" }}
      />
      <AppStack.Screen
        name="MobileSubscription"
        component={MobileSubscriptionScreen}
        options={{ presentation: "modal", headerShown: true, title: "Subscription" }}
      />
      <AppStack.Screen
        name="MobilePrivacy"
        component={MobilePrivacyScreen}
        options={{ presentation: "modal", headerShown: false, title: "Privacy Policy" }}
      />
      <AppStack.Screen
        name="MobileTerms"
        component={MobileTermsScreen}
        options={{ presentation: "modal", headerShown: false, title: "Terms of Service" }}
      />
    </AppStack.Navigator>
    </>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Survey"            component={SurveyScreen} />
      <OnboardingStack.Screen name="OnboardingSuccess" component={OnboardingSuccessScreen} />
    </OnboardingStack.Navigator>
  );
}

function AuthNavigator({ introSeen }: { introSeen: boolean }) {
  return (
    <AuthStack.Navigator id={undefined} screenOptions={{ headerShown: false }} initialRouteName={introSeen ? "Login" : "Onboarding"}>
      <AuthStack.Screen name="Onboarding"         component={OnboardingScreen} />
      <AuthStack.Screen name="Login"              component={LoginScreen} />
      <AuthStack.Screen name="Signup"             component={SignupScreen} />
      <AuthStack.Screen name="SignupConfirmation" component={SignupConfirmationScreen} />
    </AuthStack.Navigator>
  );
}

type AppState = "loading" | "unauthenticated" | "onboarding" | "app" | "password_recovery";

export default function RootNavigation() {
  const { user, isLoading, isPasswordRecovery } = useAuth();
  const { isDark } = useTheme();
  const [appState, setAppState] = useState<AppState>("loading");
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const splashHidden = useRef(false);

  // Failsafe: force-hide splash after 8 s no matter what
  useEffect(() => {
    const failsafe = setTimeout(() => {
      if (!splashHidden.current) {
        splashHidden.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 8000);
    return () => clearTimeout(failsafe);
  }, []);

  // Check intro-slides-seen, timeout after 3 s
  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      // Default to false (show Onboarding) if AsyncStorage is slow on cold start.
      // Returning users who already have a session will land in "app" state anyway.
      if (!cancelled) setIntroSeen((s) => (s !== null ? s : false));
    }, 3000);
    hasSeenIntroSlides().then((val) => {
      if (!cancelled) {
        setIntroSeen(val);
        clearTimeout(timeout);
      }
    }).catch(() => {
      // On error, default to showing Onboarding (safer for new users)
      if (!cancelled) setIntroSeen(false);
    });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  useEffect(() => {
    if (isPasswordRecovery) {
      setAppState("password_recovery");
      return;
    }

    if (isLoading) {
      setAppState(prev => prev === "app" ? prev : "loading");
      return;
    }

    if (!user) {
      setAppState("unauthenticated");
      return;
    }

    let cancelled = false;

    const checkOnboarding = async () => {
      const cached = await isOnboardingConfirmed(user.id);
      if (cached) {
        if (!cancelled) setAppState("app");
        return;
      }

      try {
        // Race the DB query against a 4 s timeout — on Android the query can hang
        // and leave the user stuck on the Login screen indefinitely.
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("onboarding_check_timeout")), 4000)
        );
        const queryPromise = supabase
          .from("user_profile")
          .select("user_id, onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        const result = await Promise.race([queryPromise, timeoutPromise]) as Awaited<typeof queryPromise>;

        if (cancelled) return;

        const completed = !result.error && !!result.data?.user_id;
        if (completed) setOnboardingConfirmed(user.id);
        setAppState(completed ? "app" : "onboarding");
      } catch (err) {
        // Timeout or network error — assume onboarding complete for existing users
        // so they land in the app rather than being stuck on Login.
        if (!cancelled) setAppState("app");
      }
    };

    setAppState(prev => prev === "app" ? prev : "loading");
    checkOnboarding();

    return () => { cancelled = true; };
  }, [user, isLoading, isPasswordRecovery]);

  // Register direct callback for onboarding completion.
  // OnboardingSuccess calls triggerOnboardingComplete() which invokes this directly —
  // more reliable than DeviceEventEmitter across navigator boundaries on iOS.
  useEffect(() => {
    registerOnboardingCompleteHandler(() => setAppState("app"));
    return () => registerOnboardingCompleteHandler(() => {});
  }, []);

  // Hide splash only when BOTH auth state and intro-seen check are resolved
  useEffect(() => {
    if (appState !== "loading" && introSeen !== null && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appState, introSeen]);

  const showLoadingOverlay = appState === "loading" || introSeen === null;
  const overlayBg = isDark ? "#09090b" : "#ffffff";

  // Force-clear overlay after 6 s — ensures first-launch users see the app even if auth hangs
  const [forceClear, setForceClear] = useState(false);
  useEffect(() => {
    if (!showLoadingOverlay) { setForceClear(false); return; }
    const t = setTimeout(() => setForceClear(true), 6000);
    return () => clearTimeout(t);
  }, [showLoadingOverlay]);

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer linking={linking} theme={isDark ? NAV_DARK_THEME : NAV_LIGHT_THEME}>
        <StatusBar style={isDark ? "light" : "dark"} />
        {appState === "app"               && <AppNavigator />}
        {appState === "onboarding"        && <OnboardingNavigator />}
        {appState === "password_recovery" && <ResetPasswordScreen />}
        {(appState === "unauthenticated" || appState === "loading") && (
          <AuthNavigator
            key={introSeen === null ? "auth-loading" : "auth-ready"}
            introSeen={introSeen ?? false}
          />
        )}
      </NavigationContainer>

      {showLoadingOverlay && !forceClear && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayBg, alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator size="large" color="#84cc16" />
        </View>
      )}
    </View>
  );
}
