// 🚩 FLAG: fixed top-4 right-4 CSS position → absolute positioning with SafeAreaInsets
// 🚩 FLAG: useIsMobile always true in RN — always renders icon-only size
import React, { useState } from "react";
import { View, Text, Platform } from "react-native";
import { MessageSquare } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import FeedbackModal from "./FeedbackModal";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const FloatingFeedbackButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { trackEvent } = useActivityTracker();

  const handleOpen = () => {
    trackEvent("feedback_open", "feedback_modal");
    setIsModalOpen(true);
  };

  const isWeb = Platform.OS === "web";

  return (
    <>
      {/* On web: position fixed to browser window. On native: absolute within parent. */}
      <View style={isWeb
        ? { position: "fixed" as any, top: 16, right: 16, zIndex: 1000 }
        : { position: "absolute", top: 16, right: 16, zIndex: 50 }
      }>
        <Button
          onPress={handleOpen}
          size={isWeb ? "default" : "icon"}
          className="bg-lime-500 shadow-lg"
          style={isWeb ? { borderRadius: 8 } : { width: 56, height: 56, borderRadius: 28 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MessageSquare size={isWeb ? 16 : 22} color="#ffffff" />
            {isWeb && (
              <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>Feedback</Text>
            )}
          </View>
        </Button>
      </View>

      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default FloatingFeedbackButton;
