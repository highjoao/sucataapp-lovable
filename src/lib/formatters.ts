/**
 * Formata um valor monetário no padrão brasileiro (BRL).
 * Remove a parte decimal (.00) quando o valor for um número inteiro.
 * 
 * @param value - O valor a ser formatado (number, string, null ou undefined)
 * @returns String formatada no padrão monetário brasileiro
 * 
 * @example
 * formatCurrency(3500) // "R$ 3.500"
 * formatCurrency(3500.50) // "R$ 3.500,50"
 * formatCurrency("1234.56") // "R$ 1.234,56"
 * formatCurrency(null) // "R$ 0"
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  // Converte para número, tratando valores inválidos como 0
  const numericValue = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  
  // Verifica se o valor é NaN e trata como 0
  const safeValue = isNaN(numericValue) ? 0 : numericValue;
  
  // Verifica se o valor é um número inteiro
  const isInteger = Number.isInteger(safeValue);
  
  // Formata usando Intl.NumberFormat
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: isInteger ? 0 : 2,
  });
  
  return formatter.format(safeValue);
};
