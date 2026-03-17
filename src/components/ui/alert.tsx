import * as React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

export interface AlertProps {
  variant?: "default" | "destructive" | "warning";
  className?: string;
  children?: React.ReactNode;
}

const variantClasses: Record<NonNullable<AlertProps["variant"]>, string> = {
  default: "border-border bg-background",
  destructive: "border-destructive/50 bg-destructive/10",
  warning: "",
};

export function Alert({ variant = "default", className, children }: AlertProps) {
  const { isDark } = useTheme();
  const warningStyle = variant === "warning"
    ? {
        backgroundColor: isDark ? "#1c1409" : "#fefce8",
        borderColor: isDark ? "#ca8a04" : "rgba(234,179,8,0.5)",
      }
    : undefined;

  return (
    <View
      className={cn("w-full rounded-lg border p-4", variantClasses[variant], className)}
      style={warningStyle}
    >
      {children}
    </View>
  );
}

export interface AlertTitleProps {
  className?: string;
  children?: React.ReactNode;
}

export function AlertTitle({ className, children }: AlertTitleProps) {
  return (
    <Text
      className={cn(
        "mb-1 font-medium leading-none tracking-tight text-foreground",
        className
      )}
    >
      {children}
    </Text>
  );
}

export interface AlertDescriptionProps {
  className?: string;
  children?: React.ReactNode;
}

export function AlertDescription({ className, children }: AlertDescriptionProps) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </Text>
  );
}
