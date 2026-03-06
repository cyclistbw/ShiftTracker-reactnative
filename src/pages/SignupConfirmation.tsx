// 🚩 FLAG: gtag conversion event removed (no Google Analytics in native)
// 🚩 FLAG: <Link to="/login"> -> navigation.navigate("Login")
// 🚩 FLAG: <div>/<p>/<h2> -> <View>/<Text>
import { useNavigation } from "@react-navigation/native";
import { View, Text } from "react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SignupConfirmation = () => {
  const navigation = useNavigation<any>();

  return (
    <View className="flex-1 items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <View className="items-center">
            <View className="mb-6">
              <Text className="text-2xl font-bold text-primary">ShiftTracker</Text>
            </View>
            <Text className="text-2xl font-bold text-green-600 mb-4">Check your email!</Text>
            <Text className="text-muted-foreground mb-6 text-center">
              We have sent you a confirmation link. Please check your email and click the link to verify your account.
            </Text>
            <Button className="w-full" onPress={() => navigation.navigate("Login")}>
              Go to Login
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
};

export default SignupConfirmation;
