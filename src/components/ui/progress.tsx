// 🚩 FLAG: Radix UI Progress → View with width-based indicator (no DOM translate available)
import * as React from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value?: number;
  className?: string;
}

const Progress = React.forwardRef<View, ProgressProps>(
  ({ className, value = 0 }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value));
    return (
      <View
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
      >
        <View
          className="h-full bg-primary"
          style={{ width: `${clampedValue}%` }}
        />
      </View>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
