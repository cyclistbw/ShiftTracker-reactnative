import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/integrations/supabase/client";

interface State {
  hasError: boolean;
  error: Error | null;
}

async function logCrashToSupabase(error: Error, info: React.ErrorInfo) {
  const payload = {
    error_message: error.message ?? "Unknown error",
    error_stack: error.stack ?? null,
    component_stack: info.componentStack ?? null,
    app_version: Constants.expoConfig?.version ?? null,
    platform: Platform.OS,
    os_version: String(Platform.Version),
    device: Device.modelName ?? null,
  };

  // Always write to AsyncStorage first as a local backup
  try {
    const existing = await AsyncStorage.getItem("pending_crash_logs");
    const logs = existing ? JSON.parse(existing) : [];
    logs.push({ ...payload, timestamp: new Date().toISOString() });
    await AsyncStorage.setItem("pending_crash_logs", JSON.stringify(logs.slice(-10)));
  } catch {}

  // Then try Supabase
  try {
    await supabase.from("crash_logs").insert(payload);
  } catch {}
}

// Call this on app launch to flush any locally buffered crash logs
export async function flushPendingCrashLogs() {
  try {
    const existing = await AsyncStorage.getItem("pending_crash_logs");
    if (!existing) return;
    const logs = JSON.parse(existing);
    if (!logs.length) return;
    const { error } = await supabase.from("crash_logs").insert(logs);
    if (!error) await AsyncStorage.removeItem("pending_crash_logs");
  } catch {}
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
    // Ensure splash is always dismissed even if the normal hide path never ran
    SplashScreen.hideAsync().catch(() => {});
    // Log to Supabase for remote visibility
    logCrashToSupabase(error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? "Unknown error";
      const stack = this.state.error?.stack?.slice(0, 400) ?? "";
      return (
        <View style={{ flex: 1, backgroundColor: "#ffffff", padding: 24, paddingTop: 60 }}>
          <View style={{ backgroundColor: "#ef4444", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>CRASH — copy this and send to developer</Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 4 }}>Error:</Text>
          <Text selectable style={{ fontSize: 12, color: "#dc2626", marginBottom: 12, fontFamily: "monospace" }}>{msg}</Text>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 4 }}>Stack:</Text>
          <Text selectable style={{ fontSize: 10, color: "#374151", fontFamily: "monospace", marginBottom: 24 }}>{stack}</Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: "#84cc16", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
