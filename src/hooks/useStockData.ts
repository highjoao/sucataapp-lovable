import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type StockItem = Pick<Tables<"stock">, "id" | "material_id" | "quantity">;

export const useStockData = () => {
  // Get stock overview
  const { data: stockData = [], isLoading: isLoadingStock, error: errorStock } = useQuery({
    queryKey: ["stockData"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Query otimizada: seleciona apenas campos essenciais e filtra por estoque positivo
      const { data, error } = await supabase
        .from("stock")
        .select(`id, material_id, quantity`)
        .eq("user_id", user.id)
        .gt("quantity", 0) // Filtra apenas estoque positivo
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as StockItem[];
    },
  });

  return {
    stockData,
    isLoadingStock,
    errorStock,
  };
};
