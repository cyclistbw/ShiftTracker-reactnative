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
          className="absolute w-44 h-44 rounded-full bg-red-300 opacity-40"
        />
      )}
      <Pressable
        onPress={handlePress}
        className={cn(
          "w-40 h-40 rounded-full shadow-lg items-center justify-center",
          bgColor
        )}
      >
        <View className="items-center">
          {isActive ? (
            isPaused ? (
              <>
                <Play size={48} color="#ffffff" />
                <Text className="text-white font-semibold text-base mt-2">Resume</Text>
              </>
            ) : isMileageOnly ? (
              <>
                <Square size={48} color="#ffffff" />
                <Text className="text-white font-semibold text-base mt-2">End Tracking</Text>
              </>
            ) : (
              <>
                <Pause size={48} color="#ffffff" />
                <Text className="text-white font-semibold text-base mt-2">Pause</Text>
              </>
            )
          ) : (
            <>
              <Play size={48} color="#ffffff" />
              <Text className="text-white font-semibold text-base mt-2">Start Shift</Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
};

export default ShiftButton;
