import * as React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";
import { cn } from "@/lib/utils";

export interface ButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  textClassName?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-primary",
  destructive: "bg-destructive",
  outline: "border border-input bg-background",
  secondary: "bg-secondary",
  ghost: "bg-transparent",
  link: "bg-transparent",
};

const variantTextClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "text-primary-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
  secondary: "text-secondary-foreground",
  ghost: "text-foreground",
  link: "text-primary underline",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-8",
  icon: "h-10 w-10",
};

const sizeTextClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "text-sm font-medium",
  sm: "text-sm font-medium",
  lg: "text-base font-medium",
  icon: "text-sm font-medium",
};

export function Button({
  variant = "default",
  size = "default",
  className,
  textClassName,
  disabled,
  loading,
  onPress,
  children,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        "flex-row items-center justify-center rounded-md",
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && "opacity-50",
        className
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          className={variantTextClasses[variant]}
        />
      ) : typeof children === "string" ? (
        <Text
          className={cn(
            variantTextClasses[variant],
            sizeTextClasses[size],
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
