import React, { createContext, useContext, useState, useEffect } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "@shift_tracker_theme";

/**
 * CSS custom property values for each theme.
 * These are applied via NativeWind's vars() to a root View, making them
 * available to all descendant components via NativeWind's VariableContext.
 * Light color values match the previous hardcoded tailwind.config.js values.
 */
const LIGHT_VARS = vars({
  "--background": "#f9fafb",
  "--foreground": "#111827",
  "--card": "#ffffff",
  "--card-foreground": "#111827",
  "--primary": "#65a30d",
  "--primary-foreground": "#ffffff",
  "--muted": "#f3f4f6",
  "--muted-foreground": "#6b7280",
  "--border": "#e5e7eb",
  "--input": "#e5e7eb",
  "--ring": "#65a30d",
  "--secondary": "#f3f4f6",
  "--secondary-foreground": "#111827",
  "--accent": "#f3f4f6",
  "--accent-foreground": "#111827",
  "--popover": "#ffffff",
  "--popover-foreground": "#111827",
  "--destructive": "#ef4444",
  "--destructive-foreground": "#ffffff",
});

const DARK_VARS = vars({
  "--background": "#0f172a",
  "--foreground": "#f1f5f9",
  "--card": "#1e293b",
  "--card-foreground": "#f1f5f9",
  "--primary": "#84cc16",
  "--primary-foreground": "#0f172a",
  "--muted": "#1e293b",
  "--muted-foreground": "#94a3b8",
  "--border": "#334155",
  "--input": "#334155",
  "--ring": "#84cc16",
  "--secondary": "#1e293b",
  "--secondary-foreground": "#f1f5f9",
  "--accent": "#1e293b",
  "--accent-foreground": "#f1f5f9",
  "--popover": "#1e293b",
  "--popover-foreground": "#f1f5f9",
  "--destructive": "#f87171",
  "--destructive-foreground": "#0f172a",
});

// Hardcoded resolved values for components that can't use CSS variables via className
// (e.g. navigation tab bar, chart icon colors, style-prop-only theming).
export const THEME_COLORS = {
  light: {
    background: "#f9fafb",
    foreground: "#111827",
    card: "#ffffff",
    muted: "#f3f4f6",
    mutedForeground: "#6b7280",
    border: "#e5e7eb",
    primary: "#65a30d",
    tabBarBg: "#ffffff",
    tabBarBorder: "#e5e7eb",
    tabBarActive: "#65a30d",
    tabBarInactive: "#6b7280",
  },
  dark: {
    background: "#0f172a",
    foreground: "#f1f5f9",
    card: "#1e293b",
    muted: "#1e293b",
    mutedForeground: "#94a3b8",
    border: "#334155",
    primary: "#84cc16",
    tabBarBg: "#1e293b",
    tabBarBorder: "#334155",
    tabBarActive: "#84cc16",
    tabBarInactive: "#94a3b8",
  },
} as const;

interface ThemeContextValue {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof THEME_COLORS.light;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  themeMode: "light",
  setThemeMode: () => {},
  colors: THEME_COLORS.light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "dark" || saved === "light") {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  };

  const isDark = themeMode === "dark";
  const themeVars = isDark ? DARK_VARS : LIGHT_VARS;
  const colors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, colors }}>
      {/*
        Apply CSS custom properties to the root View via NativeWind's vars().
        NativeWind intercepts this View and wraps it in VariableContext.Provider,
        making all CSS variable values (--background, --foreground, etc.) available
        to every descendant component that uses semantic color classes like bg-background.
        The variables upgrade happens on the first render (canUpgradeWarn=false) so no
        upgrade warning fires. Theme switches just update the VariableContext value.
      */}
      <View style={[{ flex: 1 }, themeVars]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
