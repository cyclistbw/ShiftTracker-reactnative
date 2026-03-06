// 🚩 FLAG: Radix UI Switch → React Native Switch
import * as React from "react";
import { Switch as RNSwitch, SwitchProps } from "react-native";
import { cn } from "@/lib/utils";

// 🚩 FLAG: RN Switch uses trackColor/thumbColor props instead of CSS classes
interface NativeSwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch = React.forwardRef<RNSwitch, NativeSwitchProps>(
  ({ checked = false, onCheckedChange, disabled, className }, ref) => {
    return (
      <RNSwitch
        ref={ref}
        value={checked}
        onValueChange={onCheckedChange}
        disabled={disabled}
        trackColor={{ false: "#e2e8f0", true: "#0f172a" }}
        thumbColor="#ffffff"
      />
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
