// 🚩 FLAG: Capacitor Camera/Filesystem replaced with expo-camera + expo-image-picker
// 🚩 FLAG: toast from sonner replaced with toast from @/hooks/use-toast
// 🚩 FLAG: window.onbeforeunload / window.onpopstate removed — no browser navigation in RN
// 🚩 FLAG: isNative check removed — always native in RN; canUseCamera always true
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { toast } from "@/hooks/use-toast";

interface MobileFeatures {
  isNative: boolean;
  canUseCamera: boolean;
  canUseFileSystem: boolean;
  platform: string;
}

export const useMobileFeatures = () => {
  const [features] = useState<MobileFeatures>({
    isNative: true,
    canUseCamera: true,
    canUseFileSystem: true,
    platform: "native",
  });

  const takePhoto = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      toast({ title: "Camera permission denied", variant: "destructive" });
      return null;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      if (asset.base64) {
        return `data:image/jpeg;base64,${asset.base64}`;
      }
      return asset.uri;
    } catch (error) {
      console.error("takePhoto error:", error);
      toast({ title: "Failed to take photo. Please try again.", variant: "destructive" });
      return null;
    }
  };

  const pickFromGallery = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast({ title: "Photo library permission denied", variant: "destructive" });
      return null;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      if (asset.base64) {
        return `data:image/jpeg;base64,${asset.base64}`;
      }
      return asset.uri;
    } catch (error) {
      console.error("pickFromGallery error:", error);
      toast({ title: "Failed to pick photo. Please try again.", variant: "destructive" });
      return null;
    }
  };

  // 🚩 FLAG: Capacitor Filesystem.writeFile replaced with a no-op stub
  // File export on RN uses expo-sharing / expo-file-system — not needed here
  const saveToDevice = async (_data: string, _filename: string): Promise<boolean> => {
    toast({ title: "File saving not available in this version" });
    return false;
  };

  return {
    features,
    takePhoto,
    pickFromGallery,
    saveToDevice,
  };
};
