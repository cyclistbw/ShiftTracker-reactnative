import * as React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

export interface AlertProps {
  variant?: "default" | "destructive" | "warning";
  className?: string;
  children?: React.ReactNode;
}

const variantClasses: Record<NonNullable<AlertProps["variant"]>, string> = {
  default: "border-border bg-background",
  destructive: "border-destructive/50 bg-destructive/10",
  warning: "border-yellow-500/50 bg-yellow-50",
};

export function Alert({ variant = "default", className, children }: AlertProps) {
  return (
    <View
      className={cn(
        "w-full rounded-lg border p-4",
        variantClasses[variant],
        className
      )}
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
