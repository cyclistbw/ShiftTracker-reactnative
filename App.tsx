import "./src/global.css";
import "react-native-url-polyfill/auto";
import "react-native-gesture-handler"; // Must be first import for gesture handler

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AuthProvider } from "@/context/AuthContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { ContentModeProvider } from "@/context/ContentModeContext";
import RootNavigation from "@/navigation/index";

const queryClient = new QueryClient();

export default function App() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SubscriptionProvider>
              <ContentModeProvider>
                <RootNavigation />
                <Toast />
              </ContentModeProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
