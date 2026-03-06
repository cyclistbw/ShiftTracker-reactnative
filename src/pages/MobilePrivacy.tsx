// 🚩 FLAG: useNavigate -> useNavigation; navigate(-1) -> navigation.goBack()
// 🚩 FLAG: <div>/<h1> -> <View>/<Text>
// 🚩 FLAG: onClick -> onPress
import { useNavigation } from "@react-navigation/native";
import { View, Text } from "react-native";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react-native";
import MobilePrivacyPolicy from "@/components/mobile/MobilePrivacyPolicy";

const MobilePrivacy = () => {
  const navigation = useNavigation<any>();

  return (
    <View className="flex-1 bg-background px-4 pt-4">
      <View className="flex-row items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} />
        </Button>
        <Text className="text-xl font-bold text-foreground">Privacy Policy</Text>
      </View>
      <MobilePrivacyPolicy />
    </View>
  );
};

export default MobilePrivacy;
