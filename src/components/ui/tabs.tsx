// 🚩 FLAG: Radix UI Tabs → custom state-based tabs (no browser DOM primitives in RN)
import * as React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme, THEME_COLORS } from "@/context/ThemeContext";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
});

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

function Tabs({ value, defaultValue = "", onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const effectiveValue = value ?? internalValue;

  const handleChange = (v: string) => {
    setInternalValue(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value: effectiveValue, onValueChange: handleChange }}>
      <View className={cn("w-full", className)}>{children}</View>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <View
      className={cn(
        "flex flex-row h-10 w-full items-center rounded-md bg-muted p-1",
        className
      )}
    >
      {children}
    </View>
  );
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

function TabsTrigger({ value, className, children, disabled }: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = React.useContext(TabsContext);
  const { isDark } = useTheme();
  const isActive = activeValue === value;
  const themeColors = isDark ? THEME_COLORS.dark : THEME_COLORS.light;

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(value)}
      disabled={disabled}
      // bg-background (= var(--background)) and shadow are in style prop, not className.
      // Reason: inactive tabs start with NO CSS-variable class on their Pressable. Adding
      // bg-background after first render would trigger a NativeWind variables-upgrade with
      // canUpgradeWarn=true, causing printUpgradeWarning → stringify → NavigationStateContext
      // getter crash. Plain style props bypass NativeWind entirely.
      style={isActive ? {
        backgroundColor: themeColors.background,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1,
      } : undefined}
      className={cn(
        "flex-1 items-center justify-center rounded-sm px-2 py-1.5 mx-0.5",
        disabled && "opacity-50",
        className
      )}
    >
      <Text
        className={cn(
          "text-xs font-medium",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}

interface TabsContentProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

function TabsContent({ value, className, children }: TabsContentProps) {
  const { value: activeValue } = React.useContext(TabsContext);
  const isActive = activeValue === value;

  // Lazy-mount: only render after this tab has been activated at least once,
  // then keep it mounted and hide with display:none. This mirrors React Navigation's
  // own lazy-tab pattern and avoids mounting hidden chart components prematurely.
  const [hasBeenActive, setHasBeenActive] = React.useState(isActive);

  React.useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  if (!hasBeenActive) {
    return null;
  }

  return (
    <View
      className={cn("mt-2", className)}
      style={{ display: isActive ? "flex" : "none" }}
    >
      {children}
    </View>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
