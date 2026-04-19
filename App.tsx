import "./src/global.css";
import "react-native-url-polyfill/auto";

import React, { useEffect } from "react";
import { Platform } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ContentModeProvider } from "@/context/ContentModeContext";
import { ThemeProvider } from "@/context/ThemeContext";
import RootNavigation from "@/navigation/index";
import { ErrorBoundary, flushPendingCrashLogs } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";

// Flush any crash logs that were buffered locally during a previous session
flushPendingCrashLogs();

// Global notification handler — foreground notifications show as banners
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient();

/**
 * Registers for push notifications and stores the Expo push token in
 * user_profile so the server can send push notifications (e.g. via the
 * send-trial-notification edge function triggered by Stripe webhooks).
 */
function PushTokenRegistrar() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const register = async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        // Android requires a notification channel
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("trial", {
            name: "Trial Notifications",
            importance: Notifications.AndroidImportance.HIGH,
          });
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;

        // Store in user_profile for server-side push
        await supabase
          .from("user_profile")
          .update({ push_token: token })
          .eq("user_id", user.id);
      } catch {
        // Non-critical — notifications are optional
      }
    };

    register();
  }, [user?.id]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <ContentModeProvider>
                    <PushTokenRegistrar />
                    <RootNavigation />
                    <Toast />
                  </ContentModeProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
