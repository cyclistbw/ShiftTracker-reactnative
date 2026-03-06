
import { GigAnalyticsData } from "@/types/shift";
import { ANALYTICS_STORAGE_KEY } from "./types";

// Save analytics to local storage
export const saveAnalyticsData = (analytics: GigAnalyticsData): boolean => {
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics));
    return true;
  } catch (error) {
    console.error("Error saving analytics:", error);
    return false;
  }
};

// Get latest analytics from local storage
export const getLatestAnalyticsData = (): GigAnalyticsData | null => {
  try {
    const analyticsJson = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    
    if (!analyticsJson) {
      return null;
    }
    
    const analytics = JSON.parse(analyticsJson);
    return analytics as GigAnalyticsData;
  } catch (error) {
    console.error("Error fetching latest analytics:", error);
    return null;
  }
};
