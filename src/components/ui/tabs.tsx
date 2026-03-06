// 🚩 FLAG: Radix UI Tabs → custom state-based tabs (no browser DOM primitives in RN)
import * as React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { cn } from "@/lib/utils";

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
  const isActive = activeValue === value;

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(value)}
      disabled={disabled}
      className={cn(
        "flex-1 items-center justify-center rounded-sm px-2 py-1.5 mx-0.5",
        isActive && "bg-background shadow-sm",
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
  if (activeValue !== value) return null;

  return (
    <View className={cn("mt-2", className)}>{children}</View>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
