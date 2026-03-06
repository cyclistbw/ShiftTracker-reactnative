// 🚩 FLAG: DropdownMenu → Modal-based action sheet (no Radix dropdown in RN)
// 🚩 FLAG: Link → useNavigation; toast from sonner → toast from @/hooks/use-toast
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { UserRound, LogOut } from "lucide-react-native";
import { toast } from "@/hooks/use-toast";

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      console.log("UserMenu: Starting logout process");
      await signOut();
      console.log("UserMenu: Logout completed successfully");
      toast({ title: "Logged out successfully" });
    } catch (error) {
      console.error("UserMenu: Logout failed:", error);
      toast({ title: "Failed to log out", variant: "destructive" });
    } finally {
      setIsLoggingOut(false);
      setMenuOpen(false);
    }
  };

  if (!user) {
    return (
      <View className="flex-row gap-2">
        <Button variant="outline" size="sm" onPress={() => navigation.navigate("Login")}>
          Log In
        </Button>
        <Button size="sm" onPress={() => navigation.navigate("Signup")}>
          Sign Up
        </Button>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setMenuOpen(true)}
        className="rounded-full w-9 h-9 items-center justify-center"
      >
        <UserRound size={20} color="#374151" />
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
          <View className="flex-1 items-end justify-start pt-16 pr-4">
            <TouchableWithoutFeedback>
              <View className="w-56 rounded-md border border-border bg-background shadow-lg">
                <View className="px-2 py-1.5 border-b border-border">
                  <Text className="text-sm font-medium text-foreground">
                    {user.email}
                  </Text>
                </View>
                <Pressable
                  onPress={handleSignOut}
                  disabled={isLoggingOut}
                  className="flex-row items-center px-2 py-2"
                >
                  <LogOut size={16} color="#374151" />
                  <Text className="text-sm text-foreground ml-2">
                    {isLoggingOut ? "Logging out..." : "Log out"}
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default UserMenu;
