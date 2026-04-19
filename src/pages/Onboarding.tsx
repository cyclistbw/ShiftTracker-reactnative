import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { ChevronRight, DollarSign, Clock, TrendingUp, Brain, Users } from "lucide-react-native";
import AppLogo from "@/components/AppLogo";
import { markIntroSlidesSeen } from "@/lib/onboarding-state";

const slides = [
  {
    icon: DollarSign,
    title: "Stop guessing how much you make",
    text: "Track every shift, every mile, and every dollar in one place.",
  },
  {
    icon: Clock,
    title: "Know your real hourly pay",
    text: "Automatically calculate profit after gas, taxes, and expenses.",
  },
  {
    icon: TrendingUp,
    title: "Work smarter, not longer",
    text: "Find your best days, best hours, and highest paying apps.",
  },
  {
    icon: Brain,
    title: "Get AI recommendations",
    text: "ShiftBuddy shows when to work and how to earn more.",
  },
  {
    icon: Users,
    title: "Built for gig workers",
    text: "Used by drivers, delivery workers, and chargers every day.",
  },
];

const Onboarding = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];
  const Icon = slide.icon;

  const next = () => {
    if (isLastSlide) {
      markIntroSlidesSeen();
      navigation.navigate("Signup");
    } else {
      setCurrentSlide((s) => s + 1);
    }
  };

  const skip = () => {
    markIntroSlidesSeen();
    navigation.navigate("Login");
  };

  return (
    <View
      className="flex-1"
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, paddingHorizontal: 28 }}
    >
      {/* Header row: logo + skip */}
      <View className="flex-row items-center justify-between mb-2">
        <AppLogo size="md" />
        {!isLastSlide && (
          <Pressable onPress={skip} hitSlop={12}>
            <Text className="text-sm text-muted-foreground">Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Slide content */}
      <View className="flex-1 items-center justify-center">
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: "rgba(132, 204, 22, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <Icon size={42} color="#84cc16" />
        </View>

        <Text className="text-2xl font-bold text-foreground text-center leading-tight" style={{ marginBottom: 14 }}>
          {slide.title}
        </Text>
        <Text className="text-base text-muted-foreground text-center leading-relaxed">
          {slide.text}
        </Text>
      </View>

      {/* Bottom controls */}
      <View style={{ gap: 20 }}>
        {/* Dot indicators */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setCurrentSlide(i)}
              hitSlop={8}
              style={{
                height: 8,
                borderRadius: 4,
                width: i === currentSlide ? 32 : 8,
                backgroundColor: i === currentSlide ? "#84cc16" : "#d1d5db",
              }}
            />
          ))}
        </View>

        {/* Back + Continue row — always rendered to prevent layout shift */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => setCurrentSlide((s) => s - 1)}
            disabled={currentSlide === 0}
            style={{
              flex: 1,
              paddingVertical: 15,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: currentSlide === 0 ? "transparent" : "#d1d5db",
              backgroundColor: "transparent",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: currentSlide === 0 ? "transparent" : "#6b7280" }}>
              ← Back
            </Text>
          </Pressable>

          <Pressable
            onPress={next}
            style={{
              flex: 2,
              flexDirection: "row",
              paddingVertical: 15,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#84cc16",
              gap: 6,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {isLastSlide ? "Get Started" : "Continue"}
            </Text>
            {!isLastSlide && <ChevronRight size={18} color="#fff" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default Onboarding;
