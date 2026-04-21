
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using the anon key for JWT validation
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Use the service role key to perform writes (upsert) in Supabase
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // First check our database for recent subscription data
    const { data: existingSub } = await supabaseService
      .from("subscribers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const now = new Date();
    let shouldCheckStripe = true;

    if (existingSub?.updated_at) {
      const lastUpdate = new Date(existingSub.updated_at);
      const timeSinceUpdate = now.getTime() - lastUpdate.getTime();
      const oneHour = 60 * 60 * 1000;

      // If we checked within the last hour and they're subscribed, trust our cache
      if (timeSinceUpdate < oneHour && existingSub.subscribed) {
        logStep("Using cached subscription data", { 
          lastUpdate: existingSub.updated_at,
          ageMins: Math.round(timeSinceUpdate / 60000)
        });
        shouldCheckStripe = false;
      }
    }

    let hasActiveSub = existingSub?.subscribed || false;
    let subscriptionTier = existingSub?.subscription_tier || 'free';
    let subscriptionEnd = existingSub?.subscription_end || null;

    if (shouldCheckStripe) {
      logStep("Checking Stripe for subscription updates");
      const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length === 0) {
        logStep("No customer found, updating free tier state");
        hasActiveSub = false;
        subscriptionTier = 'free';
        subscriptionEnd = null;
      } else {
        const customerId = customers.data[0].id;
        logStep("Found Stripe customer", { customerId });

        // Check active subscriptions first
        const activeSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });
        
        // Also check canceled subscriptions that may still have time remaining
        const canceledSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "canceled",
          limit: 5,
        });

        let subscription = null;

        if (activeSubscriptions.data.length > 0) {
          subscription = activeSubscriptions.data[0];
          logStep("Active subscription found", { subscriptionId: subscription.id, cancelAtPeriodEnd: subscription.cancel_at_period_end });
        } else {
          // Check if any canceled subscription still has remaining access time
          const now = Math.floor(Date.now() / 1000);
          const validCanceled = canceledSubscriptions.data.find(
            (sub) => sub.current_period_end > now
          );
          if (validCanceled) {
            subscription = validCanceled;
            logStep("Canceled subscription with remaining access found", { 
              subscriptionId: subscription.id, 
              periodEnd: new Date(subscription.current_period_end * 1000).toISOString() 
            });
          }
        }

        if (subscription) {
          hasActiveSub = true;
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          
          // Determine subscription tier from price ID mapping
          const priceId = subscription.items.data[0].price.id;
          
          const PRICE_ID_TO_TIER: Record<string, string> = {
            'price_1TDud806hf9LhstgxzZ74Uvo': 'elite',
            'price_1TDud806hf9LhstgrCYAFuIa': 'elite',
            'price_1RlsgT06hf9LhstgsnkDTSZG': 'elite',
            'price_1Rlsh906hf9LhstgIbATIaAq': 'elite',
          };
          
          subscriptionTier = PRICE_ID_TO_TIER[priceId] || 'free';
          logStep("Determined subscription tier", { priceId, subscriptionTier, endsAt: subscriptionEnd });
        } else {
          // No active or valid canceled subscription — also check our DB subscription_end as fallback
          if (existingSub?.subscription_end) {
            const dbEnd = new Date(existingSub.subscription_end);
            if (dbEnd > now) {
              logStep("No Stripe subscription but DB shows access until", { subscription_end: existingSub.subscription_end });
              hasActiveSub = true;
              subscriptionTier = existingSub.subscription_tier || 'elite';
              subscriptionEnd = existingSub.subscription_end;
            } else {
              logStep("Subscription fully expired");
              hasActiveSub = false;
              subscriptionTier = 'free';
              subscriptionEnd = null;
            }
          } else {
            logStep("No active subscription found");
            hasActiveSub = false;
            subscriptionTier = 'free';
            subscriptionEnd = null;
          }
        }

        // Update database with fresh data
        await supabaseService.from("subscribers").upsert({
          email: user.email,
          user_id: user.id,
          stripe_customer_id: customerId,
          subscribed: hasActiveSub,
          subscription_tier: subscriptionTier,
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        logStep("Updated database with fresh Stripe data", { subscribed: hasActiveSub, subscriptionTier, subscriptionEnd });
      }
    }

    
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
