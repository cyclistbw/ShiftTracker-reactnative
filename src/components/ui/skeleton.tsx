// 🚩 FLAG: HTML div with animate-pulse → Animated.View with opacity loop
import * as React from "react";
import { Animated } from "react-native";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  const opacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className={cn("rounded-md bg-muted", className)}
    />
  );
}

export { Skeleton };
