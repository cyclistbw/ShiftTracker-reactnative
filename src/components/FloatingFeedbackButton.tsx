// 🚩 FLAG: fixed top-4 right-4 CSS position → absolute positioning with SafeAreaInsets
// 🚩 FLAG: useIsMobile always true in RN — always renders icon-only size
import React, { useState } from "react";
import { View } from "react-native";
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

  return (
    <>
      {/* 🚩 FLAG: absolute positioning — parent must have position:relative or be a full-screen View */}
      <View className="absolute top-4 right-4 z-50">
        <Button
          onPress={handleOpen}
          size="icon"
          className="bg-lime-500 shadow-lg rounded-full"
          style={{ width: 56, height: 56 }}
        >
          <MessageSquare size={22} color="#ffffff" />
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
