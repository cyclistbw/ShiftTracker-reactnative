// 🚩 FLAG: window.location.href references removed — no URL concept in RN
// 🚩 FLAG: document.createElement('input') web fallback removed — always use native camera/gallery in RN
// 🚩 FLAG: navigator.userAgent check removed — always native in RN
// 🚩 FLAG: toast from sonner → toast from @/hooks/use-toast
import React from "react";
import { View } from "react-native";
import { Camera, Image as ImageIcon } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMobileFeatures } from "@/hooks/useMobileFeatures";
import { toast } from "@/hooks/use-toast";
import { appLogger } from "@/lib/app-logger";

interface MobileReceiptCaptureProps {
  onImageCapture: (imageData: string) => void;
  onCameraStart?: () => void;
}

const MobileReceiptCapture = ({ onImageCapture, onCameraStart }: MobileReceiptCaptureProps) => {
  const { features, takePhoto, pickFromGallery } = useMobileFeatures();

  const handleTakePhoto = async () => {
    const ts = new Date().toISOString();
    appLogger.cameraCapture("Starting photo capture", "MobileReceiptCapture", "handleTakePhoto", {
      timestamp: ts,
      features,
    });

    onCameraStart?.();

    const imageData = await takePhoto();
    if (imageData) {
      appLogger.cameraCapture("Image captured successfully", "MobileReceiptCapture", "handleTakePhoto", {
        imageDataLength: imageData.length,
      });
      onImageCapture(imageData);
    } else {
      appLogger.error("camera_capture", "No image data returned from takePhoto", "MobileReceiptCapture", "handleTakePhoto");
      toast({ title: "Failed to capture image. Please try again.", variant: "destructive" });
    }
  };

  const handlePickFromGallery = async () => {
    const ts = new Date().toISOString();
    appLogger.cameraCapture("Starting gallery picker", "MobileReceiptCapture", "handlePickFromGallery", {
      timestamp: ts,
      features,
    });

    onCameraStart?.();

    try {
      const imageData = await pickFromGallery();
      if (imageData) {
        appLogger.cameraCapture("Gallery image captured successfully", "MobileReceiptCapture", "handlePickFromGallery", {
          imageDataLength: imageData.length,
        });
        onImageCapture(imageData);
      } else {
        appLogger.warn("camera_capture", "No image data from gallery", "MobileReceiptCapture", "handlePickFromGallery");
        toast({ title: "Failed to select image from gallery. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error in handlePickFromGallery:", error);
      appLogger.error("camera_capture", "Gallery picker failed", "MobileReceiptCapture", "handlePickFromGallery", error as Error);
      toast({ title: "Failed to select image from gallery. Please try again.", variant: "destructive" });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <View className="flex-row items-center gap-2">
            <Camera size={20} color="#374151" />
          </View>
          Receipt Capture
        </CardTitle>
        <CardDescription>Take a photo or select from gallery</CardDescription>
      </CardHeader>
      <CardContent>
        <View className="flex-col gap-3">
          <Button
            onPress={handleTakePhoto}
            className="flex-1 flex-row items-center gap-2"
          >
            <Camera size={16} color="#ffffff" />
            Take Photo
          </Button>
          <Button
            onPress={handlePickFromGallery}
            variant="outline"
            className="flex-1 flex-row items-center gap-2"
          >
            <ImageIcon size={16} color="#374151" />
            From Gallery
          </Button>
        </View>
      </CardContent>
    </Card>
  );
};

export default MobileReceiptCapture;
