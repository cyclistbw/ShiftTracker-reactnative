// 🚩 FLAG: Layout wrapper removed (navigator provides tabs/header in native)
// 🚩 FLAG: Tabs/TabsList/TabsTrigger/TabsContent -> state-based tab switching
// 🚩 FLAG: window.location.hash -> useState for active tab
// 🚩 FLAG: inline SVGs -> lucide-react-native icons
// 🚩 FLAG: <div>/<p> -> <View>/<Text>
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { Settings, User, Briefcase, Car } from "lucide-react-native";
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
      {/* Page Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, ...(Platform.OS === "web" && { maxWidth: 768, width: "100%", alignSelf: "center" as const }) }}>
        <View className="flex-row items-center gap-2 mb-1">
          <Settings size={22} color="#16a34a" />
          <Text className="text-2xl font-bold text-foreground">Settings</Text>
        </View>
        <Text className="text-sm text-muted-foreground">Configure your app preferences and profiles</Text>
      </View>

      {/* Segmented Tab Bar */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 4, ...(Platform.OS === "web" && { maxWidth: 768, width: "100%", alignSelf: "center" as const }) }}>
        <View className="flex-row bg-muted rounded-lg p-1">
          {tabs.map(({ key, label, Icon }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveTab(key)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-md ${isActive ? "bg-background" : ""}`}
                style={isActive ? { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : {}}
              >
                <Icon size={15} color={isActive ? "#16a34a" : "#6b7280"} />
                <Text className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, ...(Platform.OS === "web" && { maxWidth: 768, width: "100%", alignSelf: "center" as const }) }}>
        {activeTab === "personal" && <PersonalSettings />}
        {activeTab === "business" && <BusinessSettings />}
        {activeTab === "vehicles" && <VehiclesSettings />}
      </ScrollView>
    </View>
  );
};

export default SettingsPage;
