import * as React from "react";
import { View, Text, ViewStyle } from "react-native";
import { cn } from "@/lib/utils";

interface ViewProps {
  className?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ className, children, style }: ViewProps) {
  return (
    <View
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
      style={style}
    >
      {children}
    </View>
  );
}

export function CardHeader({ className, children }: ViewProps) {
  return (
    <View className={cn("flex flex-col space-y-1.5 p-6", className)}>
      {children}
    </View>
  );
}

export function CardTitle({ className, children }: ViewProps) {
  return (
    <Text
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight text-card-foreground",
        className
      )}
    >
      {children}
    </Text>
  );
}

export function CardDescription({ className, children }: ViewProps) {
  return (
    <Text className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </Text>
  );
}

export function CardContent({ className, children }: ViewProps) {
  return (
    <View className={cn("p-6 pt-0", className)}>{children}</View>
  );
}

export function CardFooter({ className, children }: ViewProps) {
  return (
    <View className={cn("flex flex-row items-center p-6 pt-0", className)}>
      {children}
    </View>
  );
}
