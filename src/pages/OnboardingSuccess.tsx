// 🚩 FLAG: useNavigate/Navigate -> useNavigation + navigation.replace
// 🚩 FLAG: Loader2 animate-spin -> ActivityIndicator
// 🚩 FLAG: <div> -> <View>; <h1>/<p> -> <Text>
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, Text, ActivityIndicator } from "react-native";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isOnboardingConfirmed, setOnboardingConfirmed } from "@/lib/onboarding-state";

const OnboardingSuccess = () => {
  const { user, isLoading } = useAuth();
  const navigation = useNavigation<any>();
  const [isLoadingOnboardingStatus, setIsLoadingOnboardingStatus] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { setIsLoadingOnboardingStatus(false); navigation.replace("Signup"); return; }
    if (isOnboardingConfirmed(user.id)) { setIsLoadingOnboardingStatus(false); return; }

    let isMounted = true;
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.from("user_profile").select("user_id, onboarding_completed").eq("user_id", user.id).maybeSingle();
        if (!isMounted) return;
        const completed = !error && !!data?.user_id;
        if (completed) { setOnboardingConfirmed(user.id); }
        else { navigation.replace("Survey"); }
      } catch (_) { if (isMounted) navigation.replace("Survey"); }
      finally { if (isMounted) setIsLoadingOnboardingStatus(false); }
    };
    checkStatus();
    return () => { isMounted = false; };
  }, [isLoading, user]);

  if (isLoading || isLoadingOnboardingStatus) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="items-center max-w-sm w-full space-y-8">
        <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center">
          <CheckCircle2 size={48} color="#16a34a" />
        </View>

        <View className="items-center space-y-3">
          <Text className="text-2xl font-bold text-foreground text-center">
            You are ready to start tracking
          </Text>
          <Text className="text-muted-foreground text-base text-center">
            We personalized your experience based on your answers.
          </Text>
        </View>

        <Button onPress={() => navigation.replace("Home")} className="w-full" size="lg">
          Start Tracking
        </Button>
      </View>
    </View>
  );
};

export default OnboardingSuccess;
