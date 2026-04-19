/**
 * Deep-link configuration for React Navigation.
 * Handles the shifttracker:// scheme used for:
 *  - Supabase email confirmation callback: shifttracker://auth/callback
 *
 * The config must mirror the nested navigator structure in index.tsx.
 * Screens not reachable via deep link are omitted.
 */
import { LinkingOptions } from "@react-navigation/native";

export const linking: LinkingOptions<any> = {
  // shifttracker:// = custom scheme (legacy / in-app links)
  // https://shifttracker.app = Universal Link (email confirmation on iOS/Android)
  prefixes: ["shifttracker://", "https://shifttracker.app"],
  config: {
    screens: {
      // AuthNavigator screens
      Login: "auth/callback",
      Signup: "signup",
      Onboarding: "onboarding",
      // OnboardingNavigator screens
      Survey: "survey",
      OnboardingSuccess: "onboarding-success",
      // AppNavigator (nested: Tabs contains tab screens)
      Tabs: {
        screens: {
          Dashboard: "",
          History: "history",
          TaxReport: "tax-report",
          Settings: "settings",
        },
      },
      Analytics: "analytics",
      MobileSubscription: "mobile-subscription",
      MobilePrivacy: "privacy",
      MobileTerms: "terms",
    },
  },
};
