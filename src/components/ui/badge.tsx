import * as React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

export interface BadgeProps {
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
  children?: React.ReactNode;
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-primary border-transparent",
  secondary: "bg-secondary border-transparent",
  destructive: "bg-destructive border-transparent",
  outline: "border-border bg-transparent",
};

const variantTextClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
};

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <View
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5",
        variantClasses[variant],
        className
      )}
    >
      <Text
        className={cn(
          "text-xs font-semibold",
          variantTextClasses[variant]
        )}
      >
        {children}
      </Text>
    </View>
  );
}
