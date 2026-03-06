// 🚩 FLAG: localStorage.getItem/setItem → AsyncStorage.getItem/setItem (async)
// 🚩 FLAG: Link → useNavigation; <div>/<h2>/<button> → <View>/<Text>/<Pressable>
import { useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Button } from "@/components/ui/button";
import { BarChart2, User, Eye, EyeOff } from "lucide-react-native";

interface HistoryHeaderProps {
  userEmail?: string;
}

const HistoryHeader = ({ userEmail }: HistoryHeaderProps) => {
  const navigation = useNavigation<any>();
  const [showEmail, setShowEmail] = useState(true);

  // 🚩 FLAG: localStorage.getItem → AsyncStorage.getItem (async)
  useEffect(() => {
    AsyncStorage.getItem("showEmail").then((saved) => {
      if (saved !== null) setShowEmail(JSON.parse(saved));
    });
  }, []);

  // 🚩 FLAG: localStorage.setItem → AsyncStorage.setItem (async)
  const toggleShowEmail = async () => {
    const next = !showEmail;
    setShowEmail(next);
    await AsyncStorage.setItem("showEmail", JSON.stringify(next));
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split("@");
    return `${"*".repeat(username.length)}@${domain}`;
  };

  return (
    <View className="flex-row justify-between items-center mb-6">
      <View className="flex-col">
        <Text className="text-2xl font-bold text-foreground">Shift History</Text>
        {userEmail && (
          <View className="flex-row items-center mt-1">
            <User size={16} color="#6b7280" />
            <Text className="text-sm text-muted-foreground mx-1">
              {showEmail ? userEmail : maskEmail(userEmail)}
            </Text>
            <Pressable onPress={toggleShowEmail} className="p-1">
              {showEmail ? (
                <EyeOff size={12} color="#6b7280" />
              ) : (
                <Eye size={12} color="#6b7280" />
              )}
            </Pressable>
          </View>
        )}
      </View>
      <Button
        variant="outline"
        onPress={() => navigation.navigate("Analytics")}
        className="flex-row items-center gap-2"
      >
        <BarChart2 size={16} color="#374151" />
        <Text className="text-foreground text-sm font-medium ml-1">Analytics</Text>
      </Button>
    </View>
  );
};

export default HistoryHeader;
