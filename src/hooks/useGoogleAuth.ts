// 🚩 FLAG: New native-only hook — no web equivalent
// Implements Google OAuth via expo-auth-session + Supabase
// expo-auth-session is not yet in package.json — run:
//   npx expo install expo-auth-session expo-web-browser
// and add the scheme "shifttracker" to app.json (already configured).
//
// Usage in Login screen:
//   const { promptAsync, loading } = useGoogleAuth();
//   <Button onPress={() => promptAsync()}>Sign in with Google</Button>
import { useEffect } from "react";
// NOTE: install expo-auth-session before using this hook
// import * as Google from "expo-auth-session/providers/google";
// import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth hook using expo-auth-session.
 *
 * SETUP REQUIRED:
 * 1. npx expo install expo-auth-session expo-web-browser
 * 2. Add Google client IDs to app.json > expo > android/ios > googleServicesFile
 * 3. Configure Supabase Dashboard > Auth > Providers > Google with the same client IDs
 * 4. Uncomment the imports and implementation below
 */
export const useGoogleAuth = () => {
  // Uncomment after installing expo-auth-session:
  //
  // const [request, response, promptAsync] = Google.useAuthRequest({
  //   androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
  //   iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  //   webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
  // });
  //
  // useEffect(() => {
  //   if (response?.type === "success") {
  //     const { id_token } = response.params;
  //     supabase.auth
  //       .signInWithIdToken({ provider: "google", token: id_token })
  //       .then(({ error }) => {
  //         if (error) {
  //           toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
  //         }
  //       });
  //   }
  // }, [response]);
  //
  // return { promptAsync, loading: !request };

  // Stub until expo-auth-session is installed:
  const promptAsync = async () => {
    toast({ title: "Google sign-in not configured yet", variant: "destructive" });
  };
  return { promptAsync, loading: false };
};
