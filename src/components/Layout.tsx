// 🚩 FLAG: useLocation + Link bottom nav → omitted; tab bar is handled by React Navigation TabNavigator
// Layout in native is a safe-area content wrapper only.
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useActivityTracker } from "@/hooks/useActivityTracker";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  // Auto-tracks page views on navigation state change
  useActivityTracker();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-background">
      <View className="flex-1 w-full px-4 py-4">
        {children}
      </View>
    </SafeAreaView>
  );
};

export default Layout;
