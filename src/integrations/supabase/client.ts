import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database } from "./types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Must be false in React Native — there is no URL to detect
      detectSessionInUrl: false,
      // PKCE flow: auth codes arrive as ?code= query params which survive
      // custom-scheme redirects on both iOS and Android.  The old implicit flow
      // put tokens in the #hash fragment, which mobile browsers/email-app
      // WebViews strip during the 302 redirect to shifttracker://.
      // The earlier race-condition between getSession() and
      // exchangeCodeForSession() was fixed (we no longer call clearStaleSession
      // on init errors), so PKCE is safe now.
      flowType: "pkce",
    },
  }
);
