/**
 * TrialExpiredModal — shown when the user's 7-day Elite trial has ended
 * and they have not converted to a paid subscription.
 *
 * Appears as a full-screen overlay. The user can either upgrade or
 * dismiss to continue on the Free plan (dismissal is remembered for
 * 24 hours so it doesn't nag on every app open).
 */
import { useState, useEffect } from "react";
import { Modal, View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Crown, Lock } from "lucide-react-native";
import { useSubscription } from "@/context/SubscriptionContext";
import { useNavigation } from "@react-navigation/native";

const DISMISSED_KEY = "st_trial_expired_dismissed_until";

const LOCKED_FEATURES = [
  "Tax reporting & expense export",
  "Income analytics & heatmap",
  "Unlimited AI (ShiftBuddy)",
  "365+ days shift history",
  "Seasonal earnings analysis",
];

export function TrialExpiredModal() {
  const { trialExpired } = useSubscription();
  const navigation = useNavigation<any>();
  const [visible, setVisible] = useState(false);

  // Check if the user already dismissed within the past 24 hours
  useEffect(() => {
    if (!trialExpired) { setVisible(false); return; }

    AsyncStorage.getItem(DISMISSED_KEY).then((val) => {
      if (val && new Date(val) > new Date()) {
        setVisible(false); // still within dismiss window
      } else {
        setVisible(true);
      }
    });
  }, [trialExpired]);

  const handleUpgrade = () => {
    setVisible(false);
    navigation.navigate("MobileSubscription");
  };

  const handleDismiss = async () => {
    // Snooze for 24 hours
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await AsyncStorage.setItem(DISMISSED_KEY, until);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 28,
            width: "100%",
            maxWidth: 380,
            gap: 20,
          }}
        >
          {/* Icon */}
          <View style={{ alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#fef2f2",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={32} color="#dc2626" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center" }}>
              Your free trial has ended
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 }}>
              Your 7-day Elite trial is over. Upgrade to keep access to all premium features.
            </Text>
          </View>

          {/* Locked features */}
          <View style={{ gap: 8 }}>
            {LOCKED_FEATURES.map((f, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Lock size={12} color="#9ca3af" />
                <Text style={{ fontSize: 13, color: "#6b7280" }}>{f}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={handleUpgrade}
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#4d7c0f" : "#65a30d",
                borderRadius: 12,
                paddingVertical: 15,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              })}
            >
              <Crown size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                Upgrade to Elite
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDismiss}
              style={{ paddingVertical: 10, alignItems: "center" }}
            >
              <Text style={{ fontSize: 13, color: "#9ca3af" }}>
                Continue with Free plan
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
