// FLAG: Navigate/useNavigate -> navigation handled by RootNavigation stack
// FLAG: lucide-react -> lucide-react-native; form onSubmit -> onPress; e.target.value -> onChangeText
// FLAG: type=email -> keyboardType=email-address; type=password -> secureTextEntry
// FLAG: button/Link -> Pressable/navigation.navigate; animate-spin -> ActivityIndicator; Checkbox -> Switch
import { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import AppLogo from "@/components/AppLogo";
import { useNavigation } from "@react-navigation/native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react-native";

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const { error } = await signIn(email, password, rememberMe);
      if (error) setError(error.message || "Login failed");
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetLoading(true);
    setError("");
    setResetSuccess("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) {
        setError(error.message);
      } else {
        setResetSuccess("Password reset email sent! Check your inbox.");
        setShowForgotPassword(false);
        setResetEmail("");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setResetLoading(false);
    }
  };

  if (isLoading) {
    return <View className="flex-1 items-center justify-center bg-background"><ActivityIndicator size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" className="px-4">
        <View className="flex-1 items-center justify-center py-8">
          <Card className="w-full max-w-sm">
            <CardHeader style={{ gap: 16 }}>
              <View className="items-center">
                <AppLogo size="md" />
              </View>
              <View style={{ gap: 4 }}>
                <CardTitle className="text-xl text-center">Welcome back</CardTitle>
                <CardDescription className="text-center">Sign in to your account to continue</CardDescription>
              </View>
            </CardHeader>
            <CardContent>
              {!showForgotPassword ? (
                <View style={{ gap: 16 }}>
                  {!!error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  {!!resetSuccess && <Alert><AlertDescription>{resetSuccess}</AlertDescription></Alert>}

                  <View style={{ gap: 6 }}>
                    <Label>Email</Label>
                    <Input keyboardType="email-address" autoCapitalize="none" placeholder="Enter your email" value={email} onChangeText={setEmail} editable={!loading} />
                  </View>
                  <View style={{ gap: 6 }}>
                    <Label>Password</Label>
                    <View className="relative">
                      <Input secureTextEntry={!showPassword} placeholder="Enter your password" value={password} onChangeText={setPassword} editable={!loading} />
                      <Pressable onPress={() => setShowPassword(!showPassword)} className="absolute right-3 top-0 bottom-0 justify-center">
                        {showPassword ? <EyeOff size={16} color="#6b7280" /> : <Eye size={16} color="#6b7280" />}
                      </Pressable>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Switch checked={rememberMe} onCheckedChange={setRememberMe} disabled={loading} />
                    <Text className="text-sm text-foreground">Remember me for 14 days</Text>
                  </View>
                  <Button onPress={handleSubmit} className="w-full" disabled={loading}>
                    {loading ? <View className="flex-row items-center gap-2"><ActivityIndicator size="small" color="#fff" /><Text className="text-white">Signing in...</Text></View> : "Sign in"}
                  </Button>
                  <View style={{ alignItems: "center", gap: 8, marginTop: 4 }}>
                    <Pressable onPress={() => setShowForgotPassword(true)}>
                      <Text className="text-sm text-blue-600">Forgot your password?</Text>
                    </Pressable>
                    <View className="flex-row">
                      <Text className="text-sm text-foreground">Don't have an account? </Text>
                      <Pressable onPress={() => navigation.navigate("Onboarding")}>
                        <Text className="text-sm text-primary">Sign up</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {!!error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                  <View style={{ gap: 6 }}>
                    <Label>Email</Label>
                    <Input keyboardType="email-address" autoCapitalize="none" placeholder="Enter your email address" value={resetEmail} onChangeText={setResetEmail} editable={!resetLoading} />
                  </View>
                  <Button onPress={handleForgotPassword} className="w-full" disabled={resetLoading}>
                    {resetLoading ? <View className="flex-row items-center gap-2"><ActivityIndicator size="small" color="#fff" /><Text className="text-white">Sending...</Text></View> : "Send reset email"}
                  </Button>
                  <View style={{ alignItems: "center", marginTop: 4 }}>
                    <Pressable onPress={() => setShowForgotPassword(false)}>
                      <Text className="text-sm text-blue-600">Back to sign in</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
