import { View, Text, Image } from "react-native";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 28, text: "text-lg" },
  md: { icon: 40, text: "text-2xl" },
  lg: { icon: 52, text: "text-3xl" },
};

export default function AppLogo({ size = "md" }: AppLogoProps) {
  const { icon, text } = sizes[size];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image
        source={require("../../assets/icon-transparent.png")}
        style={{ width: icon, height: icon }}
      />
      <Text className={`${text} font-bold text-primary`}>
        ShiftTracker<Text className="text-base font-normal">™</Text>
      </Text>
    </View>
  );
}
