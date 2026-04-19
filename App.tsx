import "./src/global.css";
import "react-native-url-polyfill/auto";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ContentModeProvider } from "@/context/ContentModeContext";
import { ThemeProvider } from "@/context/ThemeContext";
import RootNavigation from "@/navigation/index";
import { ErrorBoundary, flushPendingCrashLogs } from "@/components/ErrorBoundary";

// Flush any crash logs that were buffered locally during a previous session
flushPendingCrashLogs();

const queryClient = new QueryClient();

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
