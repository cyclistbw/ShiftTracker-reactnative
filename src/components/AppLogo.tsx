import { View, Text, Image } from "react-native";

interface AppLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: { icon: 28, fontSize: 18, tmSize: 10 },
  md: { icon: 40, fontSize: 24, tmSize: 12 },
  lg: { icon: 52, fontSize: 30, tmSize: 14 },
  xl: { icon: 72, fontSize: 36, tmSize: 16 },
};

export default function AppLogo({ size = "md" }: AppLogoProps) {
  const { icon, fontSize, tmSize } = sizes[size];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image
        source={require("../../assets/icon-transparent.png")}
        style={{ width: icon, height: icon }}
      />
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Text style={{ fontSize, fontWeight: "700", color: "#0f172a" }}>
          ShiftTracker
        </Text>
        <Text style={{ fontSize: tmSize, fontWeight: "400", color: "#0f172a", marginTop: 4 }}>
          ™
        </Text>
      </View>
    </View>
  );
}
