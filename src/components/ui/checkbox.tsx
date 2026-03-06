// 🚩 FLAG: Radix UI Checkbox → Pressable with Check icon (no DOM primitives in RN)
import * as React from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Checkbox = React.forwardRef<View, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled, className }, ref) => {
    return (
      <Pressable
        ref={ref as any}
        onPress={() => !disabled && onCheckedChange?.(!checked)}
        disabled={disabled}
        className={cn(
          "h-4 w-4 rounded-sm border border-primary items-center justify-center",
          checked && "bg-primary",
          disabled && "opacity-50",
          className
        )}
      >
        {checked && <Check size={12} color="#ffffff" />}
      </Pressable>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
