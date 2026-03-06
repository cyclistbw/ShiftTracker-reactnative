// 🚩 FLAG: useNavigate -> useNavigation
// 🚩 FLAG: navigate("/signup") -> navigation.navigate("Signup")
// 🚩 FLAG: <div>/<h1>/<p>/<button> -> <View>/<Text>/<TouchableOpacity>
// 🚩 FLAG: <img src> -> Text logo placeholder
// 🚩 FLAG: onClick -> onPress
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TouchableOpacity } from "react-native";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, DollarSign, Clock, TrendingUp, Brain, Users } from "lucide-react-native";

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
    <View className="flex-1 bg-background px-6 py-10">
      <View className="items-center pt-4">
        <Text className="text-2xl font-bold text-primary">ShiftTracker</Text>
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

      <View className="w-full pb-6 space-y-6">
        <View className="flex-row justify-center gap-2">
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setCurrentSlide(i)}
              style={{ height: 8, borderRadius: 4, width: i === currentSlide ? 32 : 8, backgroundColor: i === currentSlide ? "#16a34a" : "#9ca3af" }}
            />
          ))}
        </View>

        <View className="flex-row gap-3">
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

        {!isLastSlide ? (
          <TouchableOpacity onPress={() => navigation.navigate("Signup")} className="items-center">
            <Text className="text-sm text-muted-foreground">Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ height: 20 }} />
        )}
      </View>
    </View>
  );
};

export default Onboarding;
