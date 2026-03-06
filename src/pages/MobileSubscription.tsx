// 🚩 FLAG: useNavigate -> useNavigation
// 🚩 FLAG: navigate("/settings") -> navigation.goBack()
// 🚩 FLAG: <div> -> <View>; <h1> -> <Text>
// 🚩 FLAG: onClick -> onPress
import { useNavigation } from "@react-navigation/native";
import { View, Text, ScrollView } from "react-native";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react-native";
import MobileSubscriptionFlow from "@/components/mobile/MobileSubscriptionFlow";

const MobileSubscription = () => {
  const navigation = useNavigation<any>();

  return (
    <ScrollView className="flex-1 bg-background px-2">
      <View className="relative pt-4 pb-8">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => navigation.goBack()}
          className="absolute top-0 right-0 z-10"
        >
          <X size={20} />
        </Button>
        <Text className="text-2xl font-bold mb-6 pr-12 text-foreground">Manage Subscription</Text>
        <MobileSubscriptionFlow />
      </View>
    </ScrollView>
  );
};

export default MobileSubscription;
