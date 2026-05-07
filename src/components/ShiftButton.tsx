// 🚩 FLAG: <div> → <View>; CSS animate-pulse-light → Animated pulse loop
// 🚩 FLAG: useIsMobile always returns true in RN — removed, using fixed mobile sizes
import { View, Text, Pressable, Animated, Platform } from "react-native";
import { Play, Square, Pause } from "lucide-react-native";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const isWeb = Platform.OS === "web";
const BTN_SIZE = isWeb ? 112 : 160;
const RING_SIZE = isWeb ? 132 : 176;
const ICON_SIZE = isWeb ? 36 : 48;

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
          style={{ transform: [{ scale: pulseAnim }], position: "absolute", width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, backgroundColor: "#fca5a5", opacity: 0.4 }}
        />
      )}
      <Pressable
        onPress={handlePress}
        style={{ width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2 }}
        className={cn("shadow-lg items-center justify-center", bgColor)}
      >
        <View className="items-center">
          {isActive ? (
            isPaused ? (
              <>
                <Play size={ICON_SIZE} color="#ffffff" />
                <Text className="text-white font-semibold text-base mt-2">Resume</Text>
              </>
            ) : isMileageOnly ? (
              <>
                <Square size={ICON_SIZE} color="#ffffff" />
                <Text className="text-white font-semibold text-base mt-2">End Tracking</Text>
              </>
            ) : (
              <>
                <Pause size={ICON_SIZE} color="#ffffff" />
                <Text className="text-white font-semibold text-base mt-2">Pause</Text>
              </>
            )
          ) : (
            <>
              <Play size={ICON_SIZE} color="#ffffff" />
              <Text className="text-white font-semibold text-base mt-2">Start Shift</Text>
            </>
          )}
        </View>
      </Pressable>
    </View>
  );
};

export default ShiftButton;
