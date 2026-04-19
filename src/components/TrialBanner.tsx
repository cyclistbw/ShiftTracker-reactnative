/**
 * TrialBanner — shown at the top of all main tab screens when the user
 * has an active Elite trial. Tapping it opens the subscription flow.
 */
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Clock, X } from "lucide-react-native";
import { useSubscription } from "@/context/SubscriptionContext";

export function TrialBanner() {
  const { isTrialing, trialDaysLeft } = useSubscription();
  const navigation = useNavigation<any>();
  const [dismissed, setDismissed] = useState(false);

  if (!isTrialing || dismissed) return null;

  const isUrgent = trialDaysLeft <= 1;
  const bg = isUrgent ? "#dc2626" : "#65a30d";
  const label =
    trialDaysLeft <= 0
      ? "Your Elite trial ends today — upgrade to keep access"
      : trialDaysLeft === 1
      ? "1 day left in your Elite trial — upgrade now"
      : `${trialDaysLeft} days left in your Elite trial`;

  return (
    <View
      style={{
        backgroundColor: bg,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
      }}
    >
      <Clock size={14} color="#fff" />
      <Pressable
        style={{ flex: 1 }}
        onPress={() => navigation.navigate("MobileSubscription")}
      >
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
          Tap to upgrade
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setDismissed(true)}
        hitSlop={12}
      >
        <X size={16} color="rgba(255,255,255,0.8)" />
      </Pressable>
    </View>
  );
}
