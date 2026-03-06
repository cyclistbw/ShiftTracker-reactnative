// 🚩 FLAG: Radix UI Toggle → Pressable with pressed state (no DOM primitives in RN)
import * as React from "react";
import { Pressable, Text } from "react-native";
import { cn } from "@/lib/utils";

interface ToggleProps {
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const variantClasses = {
  default: "bg-transparent",
  outline: "border border-input bg-transparent",
};

const sizeClasses = {
  default: "h-10 px-3",
  sm: "h-9 px-2.5",
  lg: "h-11 px-5",
};

function Toggle({
  pressed = false,
  onPressedChange,
  variant = "default",
  size = "default",
  disabled,
  className,
  children,
}: ToggleProps) {
  return (
    <Pressable
      onPress={() => onPressedChange?.(!pressed)}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md",
        variantClasses[variant],
        sizeClasses[size],
        pressed && "bg-accent",
        disabled && "opacity-50",
        className
      )}
    >
      {typeof children === "string" ? (
        <Text className={cn("text-sm font-medium", pressed ? "text-accent-foreground" : "text-muted-foreground")}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export { Toggle };
