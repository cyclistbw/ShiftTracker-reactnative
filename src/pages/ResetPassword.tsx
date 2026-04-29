import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff, KeyRound } from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPasswordScreen() {
  const { clearPasswordRecovery, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setError("Please fill in both fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Brief pause so the user sees the success message, then sign out
        // cleanly so they land on the Login screen and sign in with the new password.
        setTimeout(async () => {
          clearPasswordRecovery();
          await signOut();
        }, 2000);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 28,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(132, 204, 22, 0.12)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <KeyRound size={36} color="#84cc16" />
          </View>

          {/* Heading */}
          <Text
            style={{ fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" }}
          >
            Set new password
          </Text>
          <Text
            style={{ fontSize: 15, color: "#6b7280", textAlign: "center", marginBottom: 32, lineHeight: 22 }}
          >
            Choose a strong password for your{"\n"}Shift Tracker account.
          </Text>

          {/* Form */}
          <View style={{ width: "100%", gap: 16 }}>
            {!!error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <View
                style={{
                  backgroundColor: "rgba(132, 204, 22, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(132, 204, 22, 0.3)",
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#4b7c0a", fontWeight: "600", fontSize: 14 }}>
                  Password updated! Redirecting to sign in...
                </Text>
              </View>
            )}

            <View style={{ gap: 6 }}>
              <Label>New password</Label>
              <View style={{ position: "relative" }}>
                <Input
                  secureTextEntry={!showPassword}
                  placeholder="Enter new password"
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading && !success}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}
                >
                  {showPassword
                    ? <EyeOff size={16} color="#6b7280" />
                    : <Eye size={16} color="#6b7280" />}
                </Pressable>
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Label>Confirm new password</Label>
              <View style={{ position: "relative" }}>
                <Input
                  secureTextEntry={!showConfirm}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading && !success}
                />
                <Pressable
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}
                >
                  {showConfirm
                    ? <EyeOff size={16} color="#6b7280" />
                    : <Eye size={16} color="#6b7280" />}
                </Pressable>
              </View>
            </View>

            <Button
              onPress={handleReset}
              className="w-full"
              disabled={loading || success}
            >
              {loading
                ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ color: "#fff" }}>Updating...</Text>
                  </View>
                : "Update password"}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
