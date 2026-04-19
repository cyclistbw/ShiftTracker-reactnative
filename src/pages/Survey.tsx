import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, ChevronRight } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { markOnboardingComplete, isOnboardingConfirmed, setOnboardingConfirmed } from "@/lib/onboarding-state";

type SurveyAnswers = {
  work_type: string;
  work_frequency: string;
  income_level: string;
  primary_goal: string;
  tracks_mileage: string;
  wants_more_money: string;
  apps_used: string;
  main_reason: string;
  help_goal: string;
};

const questions: { key: keyof SurveyAnswers; title: string; subtitle?: string; options: string[] }[] = [
  {
    key: "work_type",
    title: "What kind of gig work do you do?",
    options: ["Uber / Lyft", "DoorDash / Uber Eats / Grubhub", "Spark / Instacart", "Lime / scooter charging", "Multiple apps", "Other"],
  },
  {
    key: "work_frequency",
    title: "How often do you work?",
    options: ["Occasionally", "Few days per week", "Full time", "Every day"],
  },
  {
    key: "income_level",
    title: "How much do you earn per week?",
    options: ["< $200", "$200 - $500", "$500 - $1,000", "$1,000 - $1,500", "$1,500+"],
  },
  {
    key: "primary_goal",
    title: "What do you want to track most?",
    options: ["Earnings", "Mileage / taxes", "Profit after expenses", "Best times to work", "Weekly goals", "Everything"],
  },
  {
    key: "tracks_mileage",
    title: "Do you track mileage for taxes?",
    options: ["Yes", "No", "Sometimes"],
  },
  {
    key: "wants_more_money",
    title: "Do you want to earn more per hour?",
    options: ["Yes", "Definitely", "Of course", "Not sure"],
  },
  {
    key: "apps_used",
    title: "How many apps do you work at the same time?",
    options: ["1", "2", "3", "4+"],
  },
  {
    key: "main_reason",
    title: "Why are you using Shift Tracker?",
    options: ["Make more money", "Track taxes", "Stay organized", "Reduce stress", "See analytics", "Other"],
  },
  {
    key: "help_goal",
    title: "How can Shift Tracker help you most?",
    subtitle: "Pick the one that matters most to you right now.",
    options: ["Earn more money", "Track taxes / mileage", "See my real hourly pay", "Find best times to work", "Stay organized", "Reach weekly income goals", "Use AI recommendations", "Everything"],
  },
];

const Survey = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<SurveyAnswers>>({});
  const [saving, setSaving] = useState(false);
  const [isLoadingOnboardingStatus, setIsLoadingOnboardingStatus] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsLoadingOnboardingStatus(false); return; }
    if (isOnboardingConfirmed(user.id)) { setIsLoadingOnboardingStatus(false); navigation.replace("Home"); return; }

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("user_profile")
          .select("user_id, onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!isMounted) return;
        const completed = !error && !!data?.user_id;
        if (completed) { setOnboardingConfirmed(user.id); navigation.replace("Home"); }
      } catch (_) {}
      finally { if (isMounted) setIsLoadingOnboardingStatus(false); }
    };
    checkStatus();
    return () => { isMounted = false; };
  }, [authLoading, user]);

  if (authLoading || isLoadingOnboardingStatus) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#84cc16" />
      </View>
    );
  }

  const current = questions[step];
  const progress = (step + 1) / questions.length;
  const selectedValue = answers[current.key];

  const selectOption = (value: string) => setAnswers((prev) => ({ ...prev, [current.key]: value }));

  const goNext = async () => {
    if (!selectedValue || saving) return;
    if (step < questions.length - 1) { setStep((s) => s + 1); return; }

    setSaving(true);
    try {
      const finalAnswers = { ...answers, [current.key]: selectedValue } as SurveyAnswers;
      const { error } = await supabase.from("user_profile").upsert(
        { user_id: user!.id, ...finalAnswers, onboarding_completed: true },
        { onConflict: "user_id" }
      );
      if (error) {
        toast({ title: "Failed to save your answers. Please try again.", variant: "destructive" });
        setSaving(false);
        return;
      }

      const { data: verifyData, error: verifyError } = await supabase
        .from("user_profile")
        .select("onboarding_completed")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (verifyError || !verifyData?.onboarding_completed) {
        toast({ title: "Failed to confirm save. Please try again.", variant: "destructive" });
        setSaving(false);
        return;
      }

      markOnboardingComplete(user!.id);
      navigation.replace("OnboardingSuccess");
    } catch {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isLastStep = step === questions.length - 1;

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 24 }}
    >
      {/* Progress header */}
      <View style={{ marginBottom: 28 }}>
        <View className="flex-row items-center justify-between" style={{ marginBottom: 10 }}>
          <Text className="text-sm font-medium text-muted-foreground">
            Step {step + 1} of {questions.length}
          </Text>
          <Text className="text-sm font-medium" style={{ color: "#84cc16" }}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View className="rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "#e5e7eb" }}>
          <View
            style={{
              height: 4,
              borderRadius: 4,
              backgroundColor: "#84cc16",
              width: `${progress * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Question */}
      <View style={{ marginBottom: 20 }}>
        <Text className="text-xl font-bold text-foreground" style={{ marginBottom: current.subtitle ? 6 : 0 }}>
          {current.title}
        </Text>
        {current.subtitle && (
          <Text className="text-sm text-muted-foreground">{current.subtitle}</Text>
        )}
      </View>

      {/* Options */}
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
      >
        {current.options.map((option) => {
          const selected = selectedValue === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => selectOption(option)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? "#84cc16" : "#e5e7eb",
                backgroundColor: selected ? "rgba(132, 204, 22, 0.08)" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: selected ? "600" : "400",
                  color: selected ? "#4d7c0f" : "#374151",
                  flex: 1,
                }}
              >
                {option}
              </Text>
              {selected && <CheckCircle2 size={20} color="#84cc16" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Navigation */}
      <View style={{ gap: 10, paddingTop: 12 }}>
        <TouchableOpacity
          onPress={goNext}
          disabled={!selectedValue || saving}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 15,
            borderRadius: 12,
            backgroundColor: !selectedValue || saving ? "#d1d5db" : "#84cc16",
            gap: 6,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                {isLastStep ? "Finish" : "Continue"}
              </Text>
              {!isLastStep && <ChevronRight size={18} color="#fff" />}
            </>
          )}
        </TouchableOpacity>

        {step > 0 && (
          <Pressable
            onPress={() => setStep((s) => s - 1)}
            disabled={saving}
            style={{ alignItems: "center", paddingVertical: 8 }}
          >
            <Text className="text-sm text-muted-foreground">← Back</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default Survey;
