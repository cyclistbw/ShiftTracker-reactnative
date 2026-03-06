// 🚩 FLAG: Capacitor Geolocation replaced with expo-location
// 🚩 FLAG: localStorage replaced with in-memory state (AsyncStorage not needed for transient tracking state)
// 🚩 FLAG: window.CapacitorGeolocation background plugin removed — expo-location handles background via task manager
// 🚩 FLAG: isWebEnvironment removed — always native in RN
// 🚩 FLAG: navigator.geolocation.*  browser APIs removed
import { useState, useCallback, useEffect } from "react";
import * as ExpoLocation from "expo-location";
import { Location } from "@/types/shift";

const useLocationTracking = () => {
  const [tracking, setTracking] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<ExpoLocation.LocationSubscription | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isBackgroundTracking] = useState(false); // expo-location background requires TaskManager setup

  const checkPermission = useCallback(async () => {
    try {
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();
      const isGranted = status === "granted";
      setPermissionGranted(isGranted);
      return { isGranted, canRequest: status === "undetermined" };
    } catch (err) {
      console.error("checkPermission error:", err);
      setPermissionGranted(false);
      return { isGranted: false, canRequest: true };
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      const isGranted = status === "granted";
      setPermissionGranted(isGranted);
      if (!isGranted) {
        setError("Location permission denied. Please enable it in device settings.");
      } else {
        setError(null);
      }
      return isGranted;
    } catch (err) {
      console.error("requestPermission error:", err);
      setError("Error requesting location permissions");
      return false;
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      setError(null);

      const { isGranted, canRequest } = await checkPermission();
      if (!isGranted) {
        if (canRequest) {
          const granted = await requestPermission();
          if (!granted) {
            setError("Location permission not granted");
            return false;
          }
        } else {
          setError("Location permission denied");
          return false;
        }
      }

      // Get initial position
      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      const initial: Location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date(),
      };
      setLocations(prev => (prev.length > 0 ? [...prev, initial] : [initial]));

      // Watch position changes
      const sub = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.High,
          timeInterval: 15000,
          distanceInterval: 5,
        },
        (pos) => {
          setLocations(prev => [
            ...prev,
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              timestamp: new Date(),
            },
          ]);
          setError(null);
        }
      );

      setSubscription(sub);
      setTracking(true);
      return true;
    } catch (err) {
      console.error("startTracking error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error starting location tracking";
      setError(msg);
      return false;
    }
  }, [checkPermission, requestPermission]);

  const stopTracking = useCallback(async () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
    setTracking(false);
    return true;
  }, [subscription]);

  const calculateDistance = useCallback((locs: Location[]): number => {
    if (locs.length < 2) return 0;

    const R = 6371e3;
    let total = 0;
    const MIN = 3;
    const MAX_JUMP = 500;
    const MAX_SPEED = 50;

    for (let i = 1; i < locs.length; i++) {
      const a = locs[i - 1];
      const b = locs[i];
      const phi1 = (a.latitude * Math.PI) / 180;
      const phi2 = (b.latitude * Math.PI) / 180;
      const dPhi = ((b.latitude - a.latitude) * Math.PI) / 180;
      const dLam = ((b.longitude - a.longitude) * Math.PI) / 180;
      const aa =
        Math.sin(dPhi / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
      const timeDiff = (b.timestamp.getTime() - a.timestamp.getTime()) / 1000;
      const speed = timeDiff > 0 ? dist / timeDiff : 0;
      if (dist >= MIN && dist <= MAX_JUMP && speed <= MAX_SPEED) {
        total += dist;
      }
    }
    return total;
  }, []);

  const getTotalDistanceMiles = useCallback(() => {
    return calculateDistance(locations) / 1609.344;
  }, [locations, calculateDistance]);

  const clearLocations = useCallback(() => {
    setLocations([]);
  }, []);

  // 🚩 FLAG: restoreTrackingIfNeeded removed localStorage logic — no persistence in RN native version
  const restoreTrackingIfNeeded = useCallback(async (_isShiftActive: boolean, _shouldTrack: boolean) => {
    // In RN, tracking state is not persisted across app restarts
  }, []);

  useEffect(() => {
    return () => {
      if (subscription) subscription.remove();
    };
  }, [subscription]);

  return {
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
    clearLocations,
    isWebEnvironment: false,
    restoreTrackingIfNeeded,
  };
};

export default useLocationTracking;
