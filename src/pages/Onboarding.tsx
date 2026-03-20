// 🚩 FLAG: useNavigate -> useNavigation
// 🚩 FLAG: navigate("/signup") -> navigation.navigate("Signup")
// 🚩 FLAG: <div>/<h1>/<p>/<button> -> <View>/<Text>/<TouchableOpacity>
// 🚩 FLAG: onClick -> onPress
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TouchableOpacity } from "react-native";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, DollarSign, Clock, TrendingUp, Brain, Users } from "lucide-react-native";
import AppLogo from "@/components/AppLogo";

const slides = [
  { icon: DollarSign, title: "Stop guessing how much you make", text: "Track every shift, every mile, and every dollar in one place." },
  { icon: Clock, title: "Know your real hourly pay", text: "Automatically calculate profit after gas, taxes, and expenses." },
  { icon: TrendingUp, title: "Work smarter, not longer", text: "Find your best days, best hours, and highest paying apps." },
  { icon: Brain, title: "Get AI recommendations", text: "ShiftBuddy shows when to work and how to earn more." },
  { icon: Users, title: "Built for gig workers", text: "Used by drivers, delivery workers, and chargers every day." },
];

const Onboarding = () => {
  const navigation = useNavigation<any>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];
  const Icon = slide.icon;

  const next = () => {
    if (isLastSlide) {
      navigation.navigate("Signup");
    } else {
      setCurrentSlide((s) => s + 1);
    }
  };

  return (
    <View className="flex-1 bg-background px-6" style={{ paddingTop: 40, paddingBottom: 0 }}>
      <View className="items-center" style={{ paddingTop: 8 }}>
        <AppLogo size="md" />
      </View>

      <View className="flex-1 items-center justify-center">
        <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
          <Icon size={40} color="#16a34a" />
        </View>
        <Text className="text-2xl font-bold text-foreground text-center leading-tight mb-4">
          {slide.title}
        </Text>
        <Text className="text-muted-foreground text-base text-center leading-relaxed">
          {slide.text}
        </Text>
      </View>

      <View style={{ paddingBottom: 40, gap: 20 }}>
        {/* Page indicator dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setCurrentSlide(i)}
              style={{
                height: 10,
                borderRadius: 5,
                width: i === currentSlide ? 36 : 10,
                backgroundColor: i === currentSlide ? "#16a34a" : "#d1d5db",
              }}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {currentSlide > 0 && (
            <Button variant="outline" onPress={() => setCurrentSlide((s) => s - 1)} className="flex-1 flex-row items-center">
              <ChevronLeft size={16} />
              <Text> Back</Text>
            </Button>
          )}
          <Button onPress={next} className="flex-1 flex-row items-center justify-center">
            <Text>{isLastSlide ? "Get Started" : "Next"}</Text>
            {!isLastSlide && <ChevronRight size={16} />}
          </Button>
        </View>

      </View>
    </View>
  );
};

export default Onboarding;
