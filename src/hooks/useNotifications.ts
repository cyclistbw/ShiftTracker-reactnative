// 🚩 FLAG: New native-only hook — no web equivalent
// Uses expo-notifications for push notification registration and scheduled local notifications
// Replaces the web pattern of showing in-app toasts for tax reminders with
// scheduled local notifications that fire even when the app is in the background.
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications are presented when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotifications = () => {
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  const registerForPushNotifications = async (): Promise<string | null> => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    return null; // Expo push token not needed for local-only notifications
  };

  /**
   * Schedule a local notification for a quarterly tax reminder.
   * Fires at the given date; cancels any existing notification with the same identifier.
   */
  const scheduleQuarterlyReminder = async (
    identifier: string,
    title: string,
    body: string,
    triggerDate: Date
  ): Promise<void> => {
    // Cancel existing notification with same id to avoid duplicates
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

    const now = new Date();
    if (triggerDate <= now) return; // Don't schedule for past dates

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  };

  const cancelAllScheduledNotifications = async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  useEffect(() => {
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("Notification received:", notification.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("Notification response:", response.notification.request.content.title);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return {
    scheduleQuarterlyReminder,
    cancelAllScheduledNotifications,
  };
};
