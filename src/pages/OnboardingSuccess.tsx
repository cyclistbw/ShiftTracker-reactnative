import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, ActivityIndicator, Pressable, DeviceEventEmitter } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, TrendingUp, Car, Brain } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isOnboardingConfirmed, setOnboardingConfirmed } from "@/lib/onboarding-state";

const highlights = [
  { icon: TrendingUp, text: "Track earnings, hours, and profit per shift" },
  { icon: Car,        text: "Log mileage and calculate your tax deduction" },
  { icon: Brain,      text: "Get AI-powered tips to maximize your income" },
];

const OnboardingSuccess = () => {
  const { user, isLoading } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [isLoadingOnboardingStatus, setIsLoadingOnboardingStatus] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setIsLoadingOnboardingStatus(false); navigation.replace("Signup"); return; }

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const alreadyConfirmed = await isOnboardingConfirmed(user.id);
        if (!isMounted) return;
        if (alreadyConfirmed) { setIsLoadingOnboardingStatus(false); return; }

        const { data, error } = await supabase
          .from("user_profile")
          .select("user_id, onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!isMounted) return;
        const completed = !error && !!data?.user_id;
        if (completed) { setOnboardingConfirmed(user.id); }
        else { navigation.replace("Survey"); }
      } catch (_) {
        if (isMounted) navigation.replace("Survey");
      } finally {
        if (isMounted) setIsLoadingOnboardingStatus(false);
      }
    };
    checkStatus();
    return () => { isMounted = false; };
  }, [isLoading, user]);

  if (isLoading || isLoadingOnboardingStatus) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#84cc16" />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 28 }}
    >
      <View className="flex-1 items-center justify-center">
        {/* Check icon */}
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: "rgba(132, 204, 22, 0.12)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <CheckCircle2 size={48} color="#84cc16" />
        </View>

        {/* Headline */}
        <Text
          className="text-2xl font-bold text-foreground text-center"
          style={{ marginBottom: 10 }}
        >
          You're all set!
        </Text>
        <Text
          className="text-base text-muted-foreground text-center"
          style={{ marginBottom: 36, lineHeight: 22 }}
        >
          Your experience has been personalized.{"\n"}Here's what you can do right now:
        </Text>

        {/* Feature highlights */}
        <View style={{ width: "100%", gap: 12, marginBottom: 40 }}>
          {highlights.map(({ icon: Icon, text }, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: "rgba(132, 204, 22, 0.06)",
                borderWidth: 1,
                borderColor: "rgba(132, 204, 22, 0.2)",
                gap: 14,
              }}
            >
              <Icon size={20} color="#84cc16" />
              <Text style={{ fontSize: 14, color: "#374151", flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA */}
      <Pressable
        onPress={() => {
          setOnboardingConfirmed(user!.id);
          DeviceEventEmitter.emit("onboardingComplete");
        }}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#65a30d" : "#84cc16",
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: "center",
        })}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
          Start Tracking
        </Text>
      </Pressable>
    </View>
  );
};

export default OnboardingSuccess;
