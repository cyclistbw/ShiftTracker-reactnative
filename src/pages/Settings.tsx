// 🚩 FLAG: Layout wrapper removed (navigator provides tabs/header in native)
// 🚩 FLAG: Tabs/TabsList/TabsTrigger/TabsContent -> state-based tab switching
// 🚩 FLAG: window.location.hash -> useState for active tab
// 🚩 FLAG: inline SVGs -> lucide-react-native icons
// 🚩 FLAG: <div>/<p> -> <View>/<Text>
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { User, Briefcase, Car } from "lucide-react-native";
import BusinessSettings from "@/components/settings/BusinessSettings";
import PersonalSettings from "@/components/settings/PersonalSettings";
import VehiclesSettings from "@/components/settings/VehiclesSettings";

const tabs = [
  { key: "personal", label: "Personal", Icon: User },
  { key: "business", label: "Business", Icon: Briefcase },
  { key: "vehicles", label: "Vehicles", Icon: Car },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("personal");

  return (
    <View className="flex-1 bg-background">
      {/* Tab Bar */}
      <View className="flex-row border-b border-border mx-4 mt-2">
        {tabs.map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            className={`flex-1 flex-row items-center justify-center gap-1 py-3 border-b-2 ${activeTab === key ? "border-primary" : "border-transparent"}`}
          >
            <Icon size={16} color={activeTab === key ? "#16a34a" : "#9ca3af"} />
            <Text className={`text-sm font-medium ${activeTab === key ? "text-primary" : "text-muted-foreground"}`}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1 px-4 pt-4">
        {activeTab === "personal" && <PersonalSettings />}
        {activeTab === "business" && <BusinessSettings />}
        {activeTab === "vehicles" && <VehiclesSettings />}
      </ScrollView>
    </View>
  );
};

export default SettingsPage;
