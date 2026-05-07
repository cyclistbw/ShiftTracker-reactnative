import { useEffect, useState } from "react";
import { View, Text, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CheckCircle } from "lucide-react-native";
import { Button } from "@/components/ui/button";

export default function PurchaseSuccessScreen() {
  const navigation = useNavigation<any>();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval);
          navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <View style={{ alignItems: "center", maxWidth: 400, width: "100%" }}>
        <CheckCircle size={72} color="#16a34a" />
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827", marginTop: 24, textAlign: "center" }}>
          You're all set!
        </Text>
        <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 12, textAlign: "center", lineHeight: 24 }}>
          Welcome to Elite. Your subscription is now active across all your devices.
        </Text>

        <View style={{ marginTop: 32, width: "100%" }}>
          <Button onPress={() => navigation.reset({ index: 0, routes: [{ name: "Tabs" }] })}>
            Go to Dashboard
          </Button>
        </View>

        <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 16 }}>
          Redirecting in {countdown}s…
        </Text>
      </View>
    </View>
  );
}
