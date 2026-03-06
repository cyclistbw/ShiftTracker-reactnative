// 🚩 FLAG: toast from sonner → toast from @/hooks/use-toast
// 🚩 FLAG: <div>/<span> → <View>/<Text>
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Navigation, AlertCircle } from "lucide-react-native";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import useLocationTracking from "@/hooks/useLocationTracking";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

interface LocationTrackerProps {
  isShiftActive: boolean;
  onLocationUpdate?: (locations: any[]) => void;
}

const LocationTracker = ({ isShiftActive, onLocationUpdate }: LocationTrackerProps) => {
  const { user } = useAuth();
  const { preferences, loading: prefsLoading, updateLocationPermission } = useUserPreferences();
  const { settings: businessSettings, loading: businessLoading } = useBusinessSettings();
  const {
    tracking,
    locations,
    error,
    permissionGranted,
    isBackgroundTracking,
    startTracking,
    stopTracking,
    checkPermission,
    requestPermission,
    getTotalDistanceMiles,
  } = useLocationTracking();

  const [permissionRequested, setPermissionRequested] = useState(false);
  const [shouldTrackGPS, setShouldTrackGPS] = useState(false);

  useEffect(() => {
    if (!businessLoading && businessSettings) {
      const isGPSMethod = businessSettings.mileageCalculationMethod === "gps_tracking";
      setShouldTrackGPS(isGPSMethod);
    }
  }, [businessSettings, businessLoading]);

  useEffect(() => {
    if (!shouldTrackGPS) return;

    if (isShiftActive && !tracking && !prefsLoading && !businessLoading) {
      if (preferences?.location_permission_granted === true) {
        handleStartTracking();
      } else if (preferences?.location_permission_granted !== false) {
        handleCheckAndRequestPermission();
      }
    } else if (!isShiftActive && tracking) {
      handleStopTracking();
    }
  }, [isShiftActive, preferences?.location_permission_granted, prefsLoading, businessLoading, shouldTrackGPS, tracking]);

  useEffect(() => {
    if (onLocationUpdate && locations.length > 0) {
      onLocationUpdate(locations);
    }
  }, [locations, onLocationUpdate]);

  const handleCheckAndRequestPermission = async () => {
    try {
      const { isGranted } = await checkPermission();
      if (isGranted) {
        if (user) await updateLocationPermission(true);
        handleStartTracking();
      }
    } catch (error) {
      console.error("LocationTracker - Error checking permission:", error);
    }
  };

  const handleStartTracking = async () => {
    const success = await startTracking();
    if (success) {
      toast({ title: "GPS tracking started" });
    } else {
      toast({ title: "Failed to start GPS tracking", variant: "destructive" });
    }
  };

  const handleStopTracking = async () => {
    await stopTracking();
    toast({ title: "GPS tracking stopped" });
  };

  const handleRequestPermission = async () => {
    if (permissionRequested) return;
    setPermissionRequested(true);

    try {
      const granted = await requestPermission();
      if (granted) {
        if (user) {
          await updateLocationPermission(true);
        }
        toast({ title: "Location permission granted" });
        if (isShiftActive && shouldTrackGPS) {
          handleStartTracking();
        }
      } else {
        toast({ title: "Location permission denied. Please enable it in your device settings.", variant: "destructive" });
        if (user) await updateLocationPermission(false);
        setPermissionRequested(false);
      }
    } catch (error) {
      console.error("LocationTracker - Permission request error:", error);
      toast({ title: "Failed to request location permission", variant: "destructive" });
      setPermissionRequested(false);
    }
  };

  if (prefsLoading || businessLoading) return null;
  if (!shouldTrackGPS) return null;

  if (error) {
    return (
      <Alert className="mb-4">
        <AlertDescription>
          <View className="flex-row items-center gap-2">
            <AlertCircle size={16} color="#6b7280" />
            <Text className="text-sm text-muted-foreground">Location Error: {error}</Text>
          </View>
        </AlertDescription>
      </Alert>
    );
  }

  if (
    (user && preferences?.location_permission_granted === false && !permissionRequested) ||
    (!user && !permissionGranted && !permissionRequested)
  ) {
    return (
      <Alert className="mb-4">
        <AlertDescription>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground flex-1">
              Location permission is required for GPS tracking during shifts.
            </Text>
            <Button size="sm" onPress={handleRequestPermission} className="ml-2">
              Grant Permission
            </Button>
          </View>
        </AlertDescription>
      </Alert>
    );
  }

  if (
    (user && preferences?.location_permission_granted === true) ||
    (!user && permissionGranted)
  ) {
    return (
      <Alert className="mb-4 bg-green-50 border-green-200">
        <AlertDescription>
          <View className="flex-row items-center gap-2">
            <Navigation size={16} color="#16a34a" />
            <Text className="text-sm text-green-800">
              GPS tracking is {tracking ? "active" : "ready"}
              {isBackgroundTracking ? " (background mode)" : ""}
              {locations.length > 0 ? ` - ${locations.length} points recorded` : ""}
              {tracking && locations.length > 0 ? ` - ${getTotalDistanceMiles().toFixed(2)} miles` : ""}
            </Text>
          </View>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default LocationTracker;
