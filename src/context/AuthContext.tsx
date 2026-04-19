import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

// Universal Link for email confirmation redirect.
// iOS/Android with the app installed → OS opens app directly (no browser).
// Desktop or devices without app → browser loads shifttracker.app/auth/callback normally.
export const AUTH_REDIRECT_URL = "https://shifttracker.app/auth/callback";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ error: Error | null; data: Session | null }>;
  signUp: (
    email: string,
    password: string,
    firstName?: string
  ) => Promise<{ error: Error | null; data: Session | null; user: User | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) console.error("Error getting initial session:", error);
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error("Unexpected session fetch error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    const timeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Handle email verification deep links: shifttracker://auth/callback#access_token=...
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes("auth/callback")) return;
      try {
        // PKCE flow: URL has ?code=CODE
        if (url.includes("code=")) {
          await supabase.auth.exchangeCodeForSession(url);
          return;
        }
        // Implicit flow: URL has #access_token=TOKEN&refresh_token=REFRESH
        const hash = url.split("#")[1];
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          }
        }
      } catch (err) {
        console.error("Auth callback error:", err);
      }
    };

    // Cold start: app was launched by tapping the verification link
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    // Warm start: app was already running when the link was tapped
    const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error, data: null };

      // Store session token in AsyncStorage (replaces localStorage)
      if (rememberMe && data?.session) {
        try {
          const { data: sessionToken } = await supabase.rpc("create_user_session", {
            p_user_id: data.user.id,
            p_remember_me: rememberMe,
          });
          if (sessionToken) {
            await AsyncStorage.setItem("st_session_token", sessionToken);
          }
        } catch (sessionErr) {
          console.warn("Session creation error:", sessionErr);
        }
      }

      return { error: null, data: data?.session || null };
    } catch (err) {
      return { error: err as Error, data: null };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string) => {
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Deep-link for email confirmation — replaces window.location.origin
          emailRedirectTo: AUTH_REDIRECT_URL,
          data: firstName ? { first_name: firstName } : undefined,
        },
      });
      return { error, data: data?.session ?? null, user: data?.user ?? null };
    } catch (err) {
      return { error: err as Error, data: null, user: null };
    }
  };

  const signOut = useCallback(async () => {
    try {
      // Clear AsyncStorage session token (replaces localStorage)
      const sessionToken = await AsyncStorage.getItem("st_session_token");
      if (sessionToken && user) {
        await AsyncStorage.removeItem("st_session_token");
        try {
          await supabase
            .from("user_sessions")
            .delete()
            .eq("user_id", user.id)
            .eq("session_token", sessionToken);
        } catch (cleanupErr) {
          console.warn("Session cleanup error:", cleanupErr);
        }
      }

      // Clear all user-specific AsyncStorage keys
      const keysToRemove = [
        "shifts",
        "currentShift",
        "analytics_storage",
        "subscription_status",
      ];

      // Also remove per-user onboarding keys
      const allKeys = await AsyncStorage.getAllKeys();
      allKeys.forEach((key) => {
        if (
          key.startsWith("st_onboarding_completed_") ||
          (user?.id &&
            (key.includes(user.id) ||
              key.includes("daily_briefing_") ||
              key.includes("daily_plan_") ||
              key.includes("daily_stats_")))
        ) {
          keysToRemove.push(key);
        }
      });

      await AsyncStorage.multiRemove(keysToRemove);

      setSession(null);
      setUser(null);

      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out exception:", err);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
