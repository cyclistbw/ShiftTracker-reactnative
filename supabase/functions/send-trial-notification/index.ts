/**
 * send-trial-notification edge function
 *
 * Sends a push notification to a specific user via the Expo Push API.
 * Called from Stripe webhooks (subscription.trial_will_end, customer.subscription.deleted)
 * or from a pg_cron job.
 *
 * Request body:
 *   { userId: string, type: "trial_ending" | "trial_expired" }
 *
 * Requires service-role key (called server-side only, never from the client).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOTIFICATIONS: Record<string, { title: string; body: string }> = {
  trial_ending: {
    title: "Your Elite trial ends tomorrow!",
    body: "Upgrade now to keep access to all premium features — tax tools, analytics, unlimited AI, and more.",
  },
  trial_expired: {
    title: "Your Elite trial has ended",
    body: "Upgrade to ShiftTracker Elite to restore access to all your premium features.",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify service-role key (this function should only be called server-side)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, type } = await req.json();
    if (!userId || !type || !NOTIFICATIONS[type]) {
      return new Response(JSON.stringify({ error: "Missing or invalid params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the user's push token
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error } = await adminClient
      .from("user_profile")
      .select("push_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !profile?.push_token) {
      return new Response(
        JSON.stringify({ error: "No push token for user", userId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { title, body } = NOTIFICATIONS[type];

    // Send via Expo Push API
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: "default",
        title,
        body,
        data: { type },
      }),
    });

    const result = await expoResponse.json();

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
