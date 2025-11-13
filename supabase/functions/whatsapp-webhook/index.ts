import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface WhatsAppMessage {
  from: string; // Número do WhatsApp no formato +5511999999999
  text: string;
}

interface ExtractedEntities {
  type: "BUY" | "SELL" | null;
  quantity: number | null;
  materialName: string | null;
  pricePerUnit: number | null;
}

// Função de PLN - mesma lógica do frontend
function extractEntitiesFromText(text: string, materials: any[]): ExtractedEntities {
  const normalizedText = text.toLowerCase().trim();
  
  const entities: ExtractedEntities = {
    type: null,
    quantity: null,
    materialName: null,
    pricePerUnit: null,
  };

  // 1. Extrai AÇÃO (compra/venda)
  const actionRegex = /(comprei|compra|comprar|vendi|venda|vender)/i;
  const actionMatch = normalizedText.match(actionRegex);
  if (actionMatch) {
    const action = actionMatch[1];
    entities.type = action.startsWith("compr") ? "BUY" : "SELL";
  }

  // 2. Extrai QUANTIDADE
  const quantityRegex = /(\d+[.,]?\d*)\s*(quilos?|kilos?|kg|toneladas?|ton|unidades?|un)/i;
  const quantityMatch = normalizedText.match(quantityRegex);
  if (quantityMatch) {
    let quantity = parseFloat(quantityMatch[1].replace(",", "."));
    const unit = quantityMatch[2].toLowerCase();
    
    if (unit.startsWith("ton")) {
      quantity *= 1000;
    }
    
    entities.quantity = quantity;
  }

  // 3. Extrai MATERIAL
  const materialMatch = materials.find((material: any) =>
    normalizedText.includes(material.name.toLowerCase())
  );
  if (materialMatch) {
    entities.materialName = materialMatch.name;
  }

  // 4. Extrai PREÇO
  const priceRegex = /(?:por|a|de)\s*(\d+[.,]?\d*)\s*(?:reais?|r\$|rs)?/i;
  const priceMatch = normalizedText.match(priceRegex);
  if (priceMatch) {
    entities.pricePerUnit = parseFloat(priceMatch[1].replace(",", "."));
  }

  return entities;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verifica a API key de segurança
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("WHATSAPP_API_KEY");

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error("Unauthorized: Invalid or missing API key");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { from, text }: WhatsAppMessage = await req.json();

    console.log("WhatsApp message received:", { from, text });

    // Inicializa Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Busca o usuário pelo número de telefone
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", from)
      .single();

    if (profileError || !profile) {
      console.error("User not found for phone:", from);
      return new Response(
        JSON.stringify({ 
          error: "Usuário não encontrado. Cadastre seu telefone no perfil do app." 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const userId = profile.id;

    // Busca os materiais do usuário para o PLN
    const { data: materials, error: materialsError } = await supabase
      .from("materials")
      .select("*")
      .eq("user_id", userId);

    if (materialsError) {
      throw materialsError;
    }

    // Extrai entidades do texto usando PLN
    const entities = extractEntitiesFromText(text, materials || []);

    // Valida se todas as entidades necessárias foram extraídas
    if (!entities.type || !entities.quantity || !entities.materialName || !entities.pricePerUnit) {
      return new Response(
        JSON.stringify({ 
          error: "Não consegui entender o comando. Use o formato: 'Comprei/Vendi X quilos/kg de MATERIAL por Y reais'",
          extracted: entities 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Valida valores numéricos extraídos
    if (entities.quantity <= 0 || entities.quantity > 999999) {
      return new Response(
        JSON.stringify({ 
          error: "Quantidade inválida. Use valores entre 0.01 e 999999.",
          extracted: entities 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (entities.pricePerUnit <= 0 || entities.pricePerUnit > 999999) {
      return new Response(
        JSON.stringify({ 
          error: "Preço inválido. Use valores entre 0.01 e 999999.",
          extracted: entities 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Busca o ID do material pelo nome
    const material = materials?.find(
      (m: any) => m.name.toLowerCase() === entities.materialName?.toLowerCase()
    );

    if (!material) {
      return new Response(
        JSON.stringify({ 
          error: `Material "${entities.materialName}" não encontrado. Cadastre-o no app primeiro.` 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Cria a transação
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: entities.type,
        material_id: material.id,
        quantity: entities.quantity,
        price_per_unit: entities.pricePerUnit,
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Error creating transaction:", transactionError);
      throw transactionError;
    }

    console.log("Transaction created successfully:", transaction);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${entities.type === "BUY" ? "Compra" : "Venda"} registrada com sucesso!`,
        transaction,
        extracted: entities
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in whatsapp-webhook:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
