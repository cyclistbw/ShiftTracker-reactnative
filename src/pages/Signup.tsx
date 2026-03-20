// FLAG: Navigate/useNavigate -> navigation handled by RootNavigation stack
// FLAG: lucide-react -> lucide-react-native; form onSubmit -> onPress; e.target.value -> onChangeText
// FLAG: type=password -> secureTextEntry; animate-spin -> ActivityIndicator
// FLAG: Link -> navigation.navigate; useNavigate/navigate -> useNavigation
import { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import AppLogo from "@/components/AppLogo";
import { useNavigation } from "@react-navigation/native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff } from "lucide-react-native";

export default function SignupScreen() {
  const { signUp, isLoading } = useAuth();
  const navigation = useNavigation<any>();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    if (!firstName.trim()) {
      setError("First name is required");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, firstName.trim());
    if (error) {
      setError(error.message);
    } else {
      navigation.navigate("SignupConfirmation");
      return;
    }
    setLoading(false);
  };

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior="padding">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 32 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center">
          <Card className="w-full max-w-sm">
            <CardHeader style={{ gap: 16 }}>
              <View className="items-center">
                <AppLogo size="md" />
              </View>
              <View style={{ gap: 4 }}>
                <CardTitle className="text-xl text-center">Create an account</CardTitle>
                <CardDescription className="text-center">Enter your details to get started</CardDescription>
              </View>
            </CardHeader>
            <CardContent>
              <View style={{ gap: 16 }}>
                {!!error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                <View style={{ gap: 6 }}>
                  <Label>Name</Label>
                  <Input placeholder="Enter your name" value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={{ gap: 6 }}>
                  <Label>Email</Label>
                  <Input keyboardType="email-address" autoCapitalize="none" placeholder="Enter your email" value={email} onChangeText={setEmail} />
                </View>
                <View style={{ gap: 6 }}>
                  <Label>Password</Label>
                  <View className="relative">
                    <Input secureTextEntry={!showPassword} placeholder="Create a password" value={password} onChangeText={setPassword} />
                    <Pressable onPress={() => setShowPassword(!showPassword)} className="absolute right-3 top-0 bottom-0 justify-center">
                      {showPassword ? <EyeOff size={16} color="#6b7280" /> : <Eye size={16} color="#6b7280" />}
                    </Pressable>
                  </View>
                  <Text className="text-xs text-muted-foreground">Tip: Use 6+ characters with a mix of uppercase, lowercase, numbers, and symbols.</Text>
                </View>
                <View style={{ gap: 6 }}>
                  <Label>Confirm Password</Label>
                  <View className="relative">
                    <Input secureTextEntry={!showConfirmPassword} placeholder="Confirm your password" value={confirmPassword} onChangeText={setConfirmPassword} />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-0 bottom-0 justify-center">
                      {showConfirmPassword ? <EyeOff size={16} color="#6b7280" /> : <Eye size={16} color="#6b7280" />}
                    </Pressable>
                  </View>
                </View>

                <Button onPress={handleSubmit} className="w-full" disabled={loading}>
                  {loading ? <View className="flex-row items-center gap-2"><ActivityIndicator size="small" color="#fff" /><Text className="text-white">Creating account...</Text></View> : "Create Account"}
                </Button>

                <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
                  <Text className="text-sm text-foreground">Already have an account? </Text>
                  <Pressable onPress={() => navigation.navigate("Login")}>
                    <Text className="text-sm text-primary">Log In</Text>
                  </Pressable>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
