/**
 * stripe-webhook edge function
 *
 * Receives Stripe webhook events, verifies the signature, and fans out
 * to the appropriate handler.
 *
 * Events handled:
 *   customer.subscription.trial_will_end  → sends "trial_ending" push (3 days warning)
 *   customer.subscription.deleted         → sends "trial_expired" push
 *
 * Required Supabase secrets (set in Dashboard → Edge Functions → Secrets):
 *   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → signing secret
 *   SUPABASE_URL            — auto-available in edge functions
 *   SUPABASE_SERVICE_ROLE_KEY — auto-available in edge functions
 */
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "STRIPE_WEBHOOK_SECRET not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify Stripe signature
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe-webhook] Invalid signature:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[stripe-webhook] Event received: ${event.type}`);

  // Map Stripe event type → notification type
  const notifTypeMap: Record<string, string> = {
    "customer.subscription.trial_will_end": "trial_ending",
    "customer.subscription.deleted":        "trial_expired",
  };

  const notifType = notifTypeMap[event.type];
  if (!notifType) {
    // Not an event we handle — acknowledge and move on
    return new Response(JSON.stringify({ received: true, handled: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Extract user_id from subscription metadata
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error("[stripe-webhook] No user_id in subscription metadata", { subscriptionId: subscription.id });
    return new Response(JSON.stringify({ error: "No user_id in subscription metadata" }), {
      status: 200, // Return 200 so Stripe doesn't retry — this is a data issue, not a server error
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Call send-trial-notification using service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-trial-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ userId, type: notifType }),
      }
    );

    const result = await response.json();
    console.log(`[stripe-webhook] send-trial-notification result:`, result);

    return new Response(JSON.stringify({ received: true, handled: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Failed to send notification:", msg);
    // Still return 200 — notification failure shouldn't cause Stripe to retry the webhook
    return new Response(JSON.stringify({ received: true, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
