import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Alert } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { invalidateShiftsCache } from "@/lib/shifts-cache";


// Custom scheme redirect for email confirmation.
// Registered in app.json via the "scheme" field — OS opens app directly when installed.
export const AUTH_REDIRECT_URL = "shifttracker://auth/callback";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    const clearStaleSession = async () => {
      // Purge all Supabase auth keys from AsyncStorage so no stale tokens remain
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const supabaseKeys = allKeys.filter(k => k.includes('supabase'));
        if (supabaseKeys.length > 0) await AsyncStorage.multiRemove(supabaseKeys);
      } catch (_) {}
      // Do NOT call supabase.auth.signOut() here — it holds an OkHttp connection
      // slot with an invalid/stale token and fires the SIGNED_OUT event again,
      // creating a loop. Storage wipe above is sufficient.
    };

    const initSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          // Do NOT call clearStaleSession here. On Android, getSession() can error
          // while exchangeCodeForSession() is running concurrently from an email-
          // confirmation deep link. Wiping AsyncStorage at this point destroys the
          // PKCE code_verifier and causes the exchange — and the sign-in — to fail.
          // Simply null out the state; onAuthStateChange will set the correct user
          // once the deep link exchange completes.
          console.warn("getSession error on init (may be mid-PKCE exchange):", error.message);
          if (mounted) { setSession(null); setUser(null); }
        } else if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        // Same reasoning: don't wipe storage on unexpected errors during init.
        console.warn("Unexpected getSession error on init:", err);
        if (mounted) { setSession(null); setUser(null); }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      // Any sign-out or failed refresh — purge stale tokens so next login is clean
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        await clearStaleSession();
        if (mounted) { setSession(null); setUser(null); setIsLoading(false); setIsPasswordRecovery(false); }
        return;
      }
      // Password reset deep link — set session but flag recovery mode so the
      // navigator routes to the ResetPassword screen instead of the app.
      if (event === "PASSWORD_RECOVERY") {
        if (mounted) { setSession(session); setUser(session?.user ?? null); setIsPasswordRecovery(true); setIsLoading(false); }
        return;
      }
      // On fresh login, navigate to the app immediately — don't block on the
      // PostgREST/PgBouncer warm-up which can take 15–20 s on cold server starts.
      // The warm-up fires in the background so that by the time the user taps
      // to another tab the connection is already warm.
      if (event === 'SIGNED_IN' && session?.user) {
        setSession(session);
        if (mounted) { setUser(session.user); setIsLoading(false); }
        supabase
          .from('user_profile')
          .select('user_id')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle()
          .catch(() => {});
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      // Do NOT clear isPasswordRecovery here — the SIGNED_IN event fires when
      // setSession() is called from handleUrl (implicit flow password reset).
      // handleUrl sets isPasswordRecovery=true immediately after setSession(),
      // so clearing it here would race and wipe the recovery flag before the
      // navigator can act on it. clearPasswordRecovery() handles the explicit clear.
      setIsLoading(false);
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

  // Handle email verification / password recovery deep links.
  // PKCE flow: shifttracker://auth/callback?code=CODE
  // Implicit fallback: shifttracker://auth/callback#access_token=TOKEN&refresh_token=REFRESH
  useEffect(() => {
    // Dedupe identical URLs — Linking.getInitialURL (cold start) and the
    // addEventListener("url") event can both fire for the same deep link,
    // and PKCE auth codes are single-use so the second call would fail.
    const processedUrls = new Set<string>();
    const handleUrl = async (url: string) => {
      if (processedUrls.has(url)) return;
      processedUrls.add(url);
      if (!url.includes("auth/callback")) return;
      console.log("[Auth] Deep link received:", url.replace(/code=[^&]+/, "code=***"));

      // Surface server-side errors (e.g. expired/used reset links) to the user
      // so they understand why the link didn't work.
      const errorMatch =
        url.match(/[?&]error_code=([^&#]+)/) ||
        url.match(/#[^&]*error_code=([^&#]+)/);
      if (errorMatch) {
        const code = decodeURIComponent(errorMatch[1]);
        const descMatch =
          url.match(/[?&]error_description=([^&#]+)/) ||
          url.match(/#[^&]*error_description=([^&#]+)/);
        const desc = descMatch ? decodeURIComponent(descMatch[1]).replace(/\+/g, " ") : code;
        if (code === "otp_expired" || code === "access_denied") {
          Alert.alert(
            "Link expired or already used",
            "This password reset link is no longer valid. Please request a new one from the Forgot Password page.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert("Authentication error", desc, [{ text: "OK" }]);
        }
        return;
      }

      // Detect recovery from the URL itself (Supabase often appends type=recovery
      // to the redirect URL).  Setting this flag BEFORE the code exchange means
      // even if the exchange races with navigation, we still route correctly.
      const urlIsRecovery =
        /[?&]type=recovery(?:&|$)/.test(url) ||
        /[?&]type=PASSWORD_RECOVERY(?:&|$)/.test(url) ||
        /#.*type=recovery/.test(url);
      if (urlIsRecovery) {
        console.log("[Auth] Recovery detected from URL params");
        setIsPasswordRecovery(true);
      }

      try {
        // ── PKCE flow ───────────────────────────────────────────────────
        // Extract just the code from query params — the SDK expects the
        // auth code string, NOT the full URL.
        const codeMatch = url.match(/[?&]code=([^&#]+)/);
        if (codeMatch) {
          const authCode = decodeURIComponent(codeMatch[1]);
          // Bypass supabase.auth.exchangeCodeForSession — on iOS its internal
          // process lock or fetch hangs indefinitely (verified via 10s timeout).
          // Talk to the /token endpoint directly, then call setSession manually.
          const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
          const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
          const allKeys = await AsyncStorage.getAllKeys();
          const verifierKey = allKeys.find((k) => k.includes("auth-token-code-verifier"));
          const storageItem = verifierKey ? await AsyncStorage.getItem(verifierKey) : null;
          const cleaned = storageItem?.replace(/^"|"$/g, "") ?? "";
          const [codeVerifier, redirectType] = cleaned.split("/");
          const isRecoveryLink = redirectType === "PASSWORD_RECOVERY";
          const errorTitle = isRecoveryLink ? "Reset link error" : "Verification error";
          if (!codeVerifier) {
            Alert.alert(errorTitle, isRecoveryLink
              ? "Missing PKCE verifier — please request a new password reset email."
              : "Missing verification token — please try clicking the confirmation link again.");
            return;
          }
          try {
            // Avoid AbortController.signal — Hermes's AbortSignal.addEventListener
            // is incomplete on some Android versions and throws "undefined is not a
            // function" inside the RN fetch polyfill. Use Promise.race instead.
            const res = await Promise.race([
              fetch(
                `${SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
                {
                  method: "POST",
                  headers: {
                    apikey: SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ auth_code: authCode, code_verifier: codeVerifier }),
                }
              ),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out")), 15000)
              ),
            ]);
            const json = await res.json();
            if (!res.ok || !json?.access_token || !json?.refresh_token) {
              // The Supabase SDK may have already exchanged this single-use code via
              // getSession() on cold start (both signup confirmation and password reset).
              // If a session exists, onAuthStateChange already handled everything — silently succeed.
              const { data: { session: s } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
              if (s?.user) return;
              Alert.alert(
                errorTitle,
                json?.error_description || json?.msg || `Status ${res.status}`
              );
              return;
            }
            if (verifierKey) await AsyncStorage.removeItem(verifierKey);
            // Set recovery flag FIRST so the navigator switches to the Reset
            // Password screen immediately — don't wait on setSession (its
            // internal lock can hang on iOS the same way exchangeCodeForSession
            // does, and the user shouldn't see the login screen in the meantime).
            if (isRecoveryLink) {
              setIsPasswordRecovery(true);
            }
            // setSession in the background with an 8s ceiling — by the time the
            // user finishes typing their new password, the session will be ready.
            await Promise.race([
              supabase.auth.setSession({
                access_token: json.access_token,
                refresh_token: json.refresh_token,
              }),
              new Promise((resolve) => setTimeout(resolve, 8000)),
            ]);
          } catch (e: any) {
            // Same silent-success check for both signup and reset links.
            const { data: { session: s } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
            if (s?.user) return;
            Alert.alert(errorTitle, `Network error: ${e?.message || String(e)}`);
          }
          return;
        }

        // ── Implicit flow fallback ──────────────────────────────────────
        // Handles any in-flight links generated before the PKCE switch.
        const hash = url.split("#")[1];
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const type = params.get("type");
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
            if (type === "recovery") {
              setIsPasswordRecovery(true);
            }
          }
          return;
        }

        // Deep link opened the app but carried no tokens or code.
        // If the URL itself signaled recovery, we already set the flag above —
        // the user can request a new password and submit it without auto-login.
        console.warn("[Auth] Deep link had no code or tokens — auto-login unavailable");
      } catch (err: any) {
        console.error("[Auth] Deep link handling error:", err);
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

      // Store session token in AsyncStorage — fire-and-forget so a slow/cold
      // PostgREST connection can't block the login flow.
      if (rememberMe && data?.session) {
        supabase.rpc("create_user_session", {
          p_user_id: data.user.id,
          p_remember_me: rememberMe,
        }).then(({ data: sessionToken }) => {
          if (sessionToken) AsyncStorage.setItem("st_session_token", sessionToken).catch(() => {});
        }).catch((sessionErr) => {
          console.warn("Session creation error:", sessionErr);
        });
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
      // Invalidate in-memory shift cache so the next user gets fresh data.
      invalidateShiftsCache();
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
      // NOTE: subscription_status is intentionally NOT cleared here — the cache
      // validates userId and has a 2-hr expiry, so it's safe to keep across
      // logout.  Clearing it forced a slow Stripe edge-function round-trip on
      // every re-login, which blocked Settings/History/TaxReport from loading.
      const keysToRemove = [
        "shifts",
        "currentShift",
        "analytics_storage",
      ];

      // Remove per-user transient keys (NOT st_onboarding_completed_ — that's a
      // per-user cache that survives sign-out so checkOnboarding doesn't have to
      // re-query Supabase on the next login, which caused the Login screen to hang
      // on Android until the slow DB round-trip finished)
      const allKeys = await AsyncStorage.getAllKeys();
      allKeys.forEach((key) => {
        if (
          user?.id &&
          (key.includes(user.id) ||
            key.includes("daily_briefing_") ||
            key.includes("daily_plan_") ||
            key.includes("daily_stats_"))
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

  const clearPasswordRecovery = useCallback(() => setIsPasswordRecovery(false), []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isPasswordRecovery, clearPasswordRecovery, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
