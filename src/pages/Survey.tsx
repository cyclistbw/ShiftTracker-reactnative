// 🚩 FLAG: useNavigate -> useNavigation
// 🚩 FLAG: Navigate -> handled by RootNavigation stack switching
// 🚩 FLAG: toast from sonner -> toast from @/hooks/use-toast
// 🚩 FLAG: Loader2 animate-spin -> ActivityIndicator
// 🚩 FLAG: Progress component -> View with width style
// 🚩 FLAG: <div>/<h1>/<button> -> <View>/<Text>/<TouchableOpacity>
// 🚩 FLAG: onClick -> onPress
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
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

const questions: { key: keyof SurveyAnswers; title: string; options: string[] }[] = [
  { key: "work_type", title: "What kind of gig work do you do?", options: ["Uber / Lyft", "DoorDash / Uber Eats / Grubhub", "Spark / Instacart", "Lime / scooter charging", "Multiple apps", "Other"] },
  { key: "work_frequency", title: "How often do you work?", options: ["Occasionally", "Few days per week", "Full time", "Every day"] },
  { key: "income_level", title: "How much do you earn per week?", options: ["< $200", "$200 - $500", "$500 - $1,000", "$1,000 - $1,500", "$1,500+"] },
  { key: "primary_goal", title: "What do you want to track most?", options: ["Earnings", "Mileage / taxes", "Profit after expenses", "Best times to work", "Weekly goals", "Everything"] },
  { key: "tracks_mileage", title: "Do you track mileage for taxes?", options: ["Yes", "No", "Sometimes"] },
  { key: "wants_more_money", title: "Do you want to earn more per hour?", options: ["Yes", "Definitely", "Of course", "Not sure"] },
  { key: "apps_used", title: "How many apps do you work at the same time?", options: ["1", "2", "3", "4+"] },
  { key: "main_reason", title: "What is your main reason for using ShiftTracker?", options: ["Make more money", "Track taxes", "Stay organized", "Reduce stress", "See analytics", "Other"] },
  { key: "help_goal", title: "How can ShiftTracker help you the most?", options: ["Earn more money", "Track taxes / mileage", "See my real hourly pay", "Find best times to work", "Stay organized", "Reach weekly income goals", "Use AI recommendations", "Everything"] },
];

const Survey = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<any>();
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
        const { data, error } = await supabase.from("user_profile").select("user_id, onboarding_completed").eq("user_id", user.id).maybeSingle();
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const current = questions[step];
  const progress = ((step + 1) / questions.length) * 100;
  const selectedValue = answers[current.key];

  const selectOption = (value: string) => setAnswers((prev) => ({ ...prev, [current.key]: value }));

  const goNext = async () => {
    if (!selectedValue || saving) return;
    if (step < questions.length - 1) { setStep((s) => s + 1); return; }

    setSaving(true);
    try {
      const finalAnswers = { ...answers, [current.key]: selectedValue } as SurveyAnswers;
      const { error } = await supabase.from("user_profile").upsert({ user_id: user!.id, ...finalAnswers, onboarding_completed: true }, { onConflict: "user_id" });
      if (error) { toast({ title: "Failed to save your answers. Please try again.", variant: "destructive" }); setSaving(false); return; }

      const { data: verifyData, error: verifyError } = await supabase.from("user_profile").select("onboarding_completed").eq("user_id", user!.id).maybeSingle();
      if (verifyError || !verifyData?.onboarding_completed) { toast({ title: "Failed to confirm save. Please try again.", variant: "destructive" }); setSaving(false); return; }

      markOnboardingComplete(user!.id);
      navigation.replace("OnboardingSuccess");
    } catch (err) {
      toast({ title: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background px-6 py-6">
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-sm text-muted-foreground">Question {step + 1} of {questions.length}</Text>
          <Text className="text-sm text-muted-foreground">{Math.round(progress)}%</Text>
        </View>
        {/* 🚩 FLAG: Progress component -> View with width percentage */}
        <View className="h-2 bg-muted rounded-full overflow-hidden">
          <View className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </View>
      </View>

      <Text className="text-xl font-bold text-foreground mb-4">{current.title}</Text>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="space-y-2">
          {current.options.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => selectOption(option)}
              className={`px-4 py-3 rounded-lg border ${selectedValue === option ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <Text className="text-sm font-medium text-foreground">{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View className="flex-row gap-3 pt-3 pb-2">
        {step > 0 && (
          <Button variant="outline" onPress={() => setStep((s) => s - 1)} disabled={saving} className="flex-1 flex-row items-center">
            <ChevronLeft size={16} />
            <Text> Back</Text>
          </Button>
        )}
        <Button onPress={goNext} disabled={!selectedValue || saving} className="flex-1 flex-row items-center justify-center">
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : step === questions.length - 1 ? (
            <Text>Finish</Text>
          ) : (
            <>
              <Text>Next</Text>
              <ChevronRight size={16} />
            </>
          )}
        </Button>
      </View>
    </View>
  );
};

export default Survey;
