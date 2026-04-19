// Must be the very first executable line — prevents splash auto-hide before JS is ready
import * as SplashScreen from "expo-splash-screen";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import App from "./App";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Absolute last-resort failsafe: if the entire React tree fails to mount and the
// component-level timers never run, this guarantees the splash hides after 8 seconds.
setTimeout(() => { SplashScreen.hideAsync().catch(() => {}); }, 8000);

// Global handler for unhandled JS errors (not caught by ErrorBoundary's componentDidCatch)
// This catches fatal JS errors and unhandled promise rejections.
const _logGlobalError = (error: unknown, isFatal?: boolean) => {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry = {
    type: "global",
    isFatal: isFatal ?? false,
    message: err.message,
    stack: err.stack?.slice(0, 600) ?? null,
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
  };
  console.error("[GlobalError]", entry);
  AsyncStorage.getItem("pending_crash_logs").then((existing) => {
    const logs = existing ? JSON.parse(existing) : [];
    logs.push(entry);
    return AsyncStorage.setItem("pending_crash_logs", JSON.stringify(logs.slice(-10)));
  }).catch(() => {});
};

// ErrorUtils is a React Native global (not a named export from 'react-native')
const ErrorUtils = (global as any).ErrorUtils;
if (ErrorUtils) {
  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    _logGlobalError(error, isFatal);
    if (previousHandler) previousHandler(error, isFatal);
  });
}

registerRootComponent(App);
