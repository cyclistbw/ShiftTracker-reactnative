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
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
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
import { isOnboardingConfirmed, setOnboardingConfirmed } from "@/lib/onboarding-state";
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
      <Tab.Navigator
        id={undefined}
        sceneContainerStyle={{ flex: 1 }}
        screenOptions={({ route }) => ({
          headerShown: false,
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
        <Tab.Screen name="History"    component={HistoryScreen}    options={{ title: "History" }} />
        <Tab.Screen name="TaxReport"  component={TaxReportScreen}  options={{ title: "Tax" }} />
        <Tab.Screen name="Settings"   component={SettingsScreen}   options={{ title: "Settings" }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

function AppNavigator() {
  return (
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

function AuthNavigator() {
  return (
    <AuthStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"              component={LoginScreen} />
      <AuthStack.Screen name="Signup"             component={SignupScreen} />
      <AuthStack.Screen name="SignupConfirmation" component={SignupConfirmationScreen} />
      <AuthStack.Screen name="Onboarding"         component={OnboardingScreen} />
    </AuthStack.Navigator>
  );
}

type AppState = "loading" | "unauthenticated" | "onboarding" | "app";

export default function RootNavigation() {
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();
  const [appState, setAppState] = useState<AppState>("loading");

  useEffect(() => {
    if (isLoading) {
      // Don't disrupt navigation if already authenticated — token refresh changes user reference
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
        const { data, error } = await supabase
          .from("user_profile")
          .select("user_id, onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        const completed = !error && !!data?.user_id;
        if (completed) setOnboardingConfirmed(user.id);
        setAppState(completed ? "app" : "onboarding");
      } catch {
        if (!cancelled) setAppState("onboarding");
      }
    };

    // Stay in "app" state while re-checking so NavigationContainer never unmounts on token refresh
    setAppState(prev => prev === "app" ? prev : "loading");
    checkOnboarding();

    return () => { cancelled = true; };
  }, [user, isLoading]);

  // Always render NavigationContainer — never let it unmount (prevents navigation context errors)
  return (
    <NavigationContainer linking={linking} theme={isDark ? NAV_DARK_THEME : NAV_LIGHT_THEME}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {appState === "loading" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#65a30d" />
        </View>
      ) : (
        <>
          {appState === "unauthenticated" && <AuthNavigator />}
          {appState === "onboarding"      && <OnboardingNavigator />}
          {appState === "app"             && <AppNavigator />}
        </>
      )}
    </NavigationContainer>
  );
}
