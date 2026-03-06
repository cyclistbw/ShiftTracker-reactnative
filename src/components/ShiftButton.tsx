// 🚩 FLAG: <div> → <View>; CSS animate-pulse-light → Animated pulse loop
// 🚩 FLAG: useIsMobile always returns true in RN — removed, using fixed mobile sizes
import { View, Text, Pressable, Animated } from "react-native";
import { Play, Square, Pause } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface ShiftButtonProps {
  isActive: boolean;
  isPaused?: boolean;
  onStart: () => void;
  onEnd: () => void;
  onPause?: () => void;
  onAddExpense?: () => void;
  isMileageOnly?: boolean;
}

const ShiftButton = ({
  isActive,
  isPaused = false,
  onStart,
  onEnd,
  onPause,
  isMileageOnly = false,
}: ShiftButtonProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, isPaused]);

  const handlePress = () => {
    if (!isActive) {
      onStart();
    } else if (isPaused) {
      onPause?.(); // Resume
    } else if (isMileageOnly) {
      onEnd();
    } else {
      onPause?.(); // Pause
    }
  };

  const bgColor = isActive
    ? isPaused
      ? "bg-amber-500"
      : "bg-red-500"
    : "bg-primary";

  return (
    <View className="items-center justify-center">
      {/* Pulsing ring behind button */}
      {isActive && !isPaused && (
        <Animated.View
          style={{ transform: [{ scale: pulseAnim }] }}
          className="absolute w-28 h-28 rounded-full bg-red-300 opacity-40"
        />
      )}
      <Pressable
        onPress={handlePress}
        className={cn(
          "w-28 h-28 rounded-full shadow-lg items-center justify-center",
          bgColor
        )}
      >
        <View className="items-center">
          {isActive ? (
            isPaused ? (
              <>
                <Play size={32} color="#ffffff" />
                <Text className="text-white font-semibold text-sm mt-1">Resume</Text>
              </>
            ) : isMileageOnly ? (
              <>
                <Square size={32} color="#ffffff" />
                <Text className="text-white font-semibold text-sm mt-1">End Tracking</Text>
              </>
            ) : (
              <>
                <Pause size={32} color="#ffffff" />
                <Text className="text-white font-semibold text-sm mt-1">Pause</Text>
              </>
            )
          ) : (
            <>
              <Play size={32} color="#ffffff" />
              <Text className="text-white font-semibold text-sm mt-1">Start Shift</Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
};

export default ShiftButton;
