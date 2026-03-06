// 🚩 FLAG: Layout wrapper removed (navigator provides tabs/header in native)
import { ScrollView } from "react-native";
import ShiftBuddy from "@/components/ShiftBuddy";

const ShiftBuddyPage = () => {
  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <ShiftBuddy />
    </ScrollView>
  );
};

export default ShiftBuddyPage;
