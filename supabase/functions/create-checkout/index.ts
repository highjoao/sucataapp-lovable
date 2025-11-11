import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-CHECKOUT] Iniciando criação de checkout");
    
    const authHeader = req.headers.get("Authorization")!;
    if (!authHeader) {
      throw new Error("Authorization header missing");
    }
    
    const token = authHeader.replace("Bearer ", "");
    console.log("[CREATE-CHECKOUT] Autenticando usuário");
    
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("Usuário não autenticado");
    console.log("[CREATE-CHECKOUT] Usuário autenticado:", user.email);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não configurada");
    
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil" 
    });
    
    console.log("[CREATE-CHECKOUT] Buscando cliente Stripe");
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CHECKOUT] Cliente encontrado:", customerId);
    } else {
      console.log("[CREATE-CHECKOUT] Novo cliente será criado");
    }

    const origin = req.headers.get("origin") || "https://ivvcfgyzoedxkkiwbsnv.supabase.co";
    console.log("[CREATE-CHECKOUT] Criando sessão de checkout");
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: "price_1SS5QVJUlhgU1kM51MVszs7P",
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/plans?canceled=true`,
    });

    console.log("[CREATE-CHECKOUT] Sessão criada:", session.id);
    
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
