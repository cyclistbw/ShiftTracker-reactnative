// 🚩 FLAG: <div>/<span> → <View>/<Text>
import { View, Text } from "react-native";
import { Navigation } from "lucide-react-native";
import useLocationTracking from "@/hooks/useLocationTracking";

const GPSStatus = () => {
  const { tracking, isBackgroundTracking } = useLocationTracking();

  return (
    <View className="flex-row items-center justify-center space-x-2">
      <Navigation size={16} color={tracking ? "#16a34a" : "#9ca3af"} />
      <Text className="text-sm text-gray-500">
        GPS Tracking: {tracking ? "Active" : "Inactive"}
      </Text>
      {isBackgroundTracking && (
        <View className="bg-blue-100 px-2 py-0.5 rounded-full">
          <Text className="text-xs text-blue-800">Background</Text>
        </View>
      )}
    </View>
  );
};

export default GPSStatus;
