import type { Tables } from "@/integrations/supabase/types";

type Material = Tables<"materials">;

export interface ExtractedEntities {
  type: "BUY" | "SELL" | null;
  quantity: number | null;
  materialName: string | null;
  pricePerUnit: number | null;
  rawText: string;
}

/**
 * Extrai entidades de um comando de voz ou texto usando Regex
 * Exemplos suportados:
 * - "comprei 5 quilos de cobre por 50 reais"
 * - "vendi 10kg de alumínio por 35 reais"
 * - "compra de 2.5 toneladas de ferro a 100 reais"
 */
export function extractEntitiesFromText(
  text: string,
  materials: Material[]
): ExtractedEntities {
  const normalizedText = text.toLowerCase().trim();
  
  const entities: ExtractedEntities = {
    type: null,
    quantity: null,
    materialName: null,
    pricePerUnit: null,
    rawText: text,
  };

  // 1. Extrai AÇÃO (compra/venda)
  const actionRegex = /(comprei|compra|comprar|vendi|venda|vender)/i;
  const actionMatch = normalizedText.match(actionRegex);
  if (actionMatch) {
    const action = actionMatch[1];
    entities.type = action.startsWith("compr") ? "BUY" : "SELL";
  }

  // 2. Extrai QUANTIDADE
  // Suporta: "5 quilos", "10kg", "2.5 toneladas", "3,5 kg"
  const quantityRegex = /(\d+[.,]?\d*)\s*(quilos?|kilos?|kg|toneladas?|ton|unidades?|un)/i;
  const quantityMatch = normalizedText.match(quantityRegex);
  if (quantityMatch) {
    let quantity = parseFloat(quantityMatch[1].replace(",", "."));
    const unit = quantityMatch[2].toLowerCase();
    
    // Converte toneladas para kg se necessário
    if (unit.startsWith("ton")) {
      quantity *= 1000;
    }
    
    entities.quantity = quantity;
  }

  // 3. Extrai MATERIAL
  // Busca pelo nome do material cadastrado no texto
  const materialMatch = materials.find((material) =>
    normalizedText.includes(material.name.toLowerCase())
  );
  if (materialMatch) {
    entities.materialName = materialMatch.name;
  }

  // 4. Extrai PREÇO
  // Suporta: "50 reais", "35.50 reais", "100,00"
  const priceRegex = /(?:por|a|de)\s*(\d+[.,]?\d*)\s*(?:reais?|r\$|rs)?/i;
  const priceMatch = normalizedText.match(priceRegex);
  if (priceMatch) {
    entities.pricePerUnit = parseFloat(priceMatch[1].replace(",", "."));
  }

  return entities;
}

/**
 * Calcula o score de confiança da extração (0-100)
 */
export function calculateConfidenceScore(entities: ExtractedEntities): number {
  let score = 0;
  
  if (entities.type) score += 25;
  if (entities.quantity && entities.quantity > 0) score += 25;
  if (entities.materialName) score += 25;
  if (entities.pricePerUnit && entities.pricePerUnit > 0) score += 25;
  
  return score;
}

/**
 * Retorna mensagens de feedback sobre os dados extraídos
 */
export function getExtractionFeedback(entities: ExtractedEntities): string[] {
  const feedback: string[] = [];
  
  if (!entities.type) {
    feedback.push("❌ Não identifiquei se é uma compra ou venda. Diga 'comprei' ou 'vendi'.");
  }
  
  if (!entities.quantity || entities.quantity <= 0) {
    feedback.push("❌ Não identifiquei a quantidade. Ex: '5 quilos', '10kg'.");
  }
  
  if (!entities.materialName) {
    feedback.push("❌ Não identifiquei o material. Certifique-se de usar um material cadastrado.");
  }
  
  if (!entities.pricePerUnit || entities.pricePerUnit <= 0) {
    feedback.push("❌ Não identifiquei o preço. Ex: 'por 50 reais', 'a 35.50'.");
  }
  
  if (feedback.length === 0) {
    feedback.push("✅ Todos os dados foram extraídos com sucesso!");
  }
  
  return feedback;
}
