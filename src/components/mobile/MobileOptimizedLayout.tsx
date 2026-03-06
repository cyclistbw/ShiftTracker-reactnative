// 🚩 FLAG: Capacitor.isNativePlatform() / Capacitor.getPlatform() → Platform from react-native
// 🚩 FLAG: <div> → <View>; cn() className string → className prop (NativeWind)
// 🚩 FLAG: Safe area inset classes → handled by SafeAreaView from react-native-safe-area-context
import React from 'react';
import { View, Platform } from 'react-native';

interface MobileOptimizedLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const MobileOptimizedLayout = ({ children, className }: MobileOptimizedLayoutProps) => {
  // 🚩 FLAG: Always native in RN — Capacitor.isNativePlatform() always true
  // 🚩 FLAG: Safe area insets are applied at the root level via SafeAreaProvider — no per-component adjustments needed
  return (
    <View className={`flex-1 bg-background px-2 ${className || ''}`}>
      {children}
    </View>
  );
};

export default MobileOptimizedLayout;
