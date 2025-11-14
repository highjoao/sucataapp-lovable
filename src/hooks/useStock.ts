import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StockItem {
  material_id: string;
  material_name: string;
  unit: string;
  current_stock: number;
  avg_purchase_price: number;
}

export const useStock = () => {
  const { toast } = useToast();

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "quantity" | "value">("name");
  const [minQuantity, setMinQuantity] = useState<string>("");
  const [minValue, setMinValue] = useState<string>("");

  // Buscar dados do estoque
  const { data: stock = [], isLoading, error } = useQuery({
    queryKey: ["stock"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("get_user_stock");

      if (error) {
        toast({
          title: "Erro ao carregar estoque",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      return (data as StockItem[]) || [];
    },
  });

  // Calcular stock filtrado e ordenado usando useMemo
  const filteredStock = useMemo(() => {
    let filtered = [...stock];

    // Filtro de busca por nome
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.material_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro para mostrar apenas itens em estoque
    if (showOnlyInStock) {
      filtered = filtered.filter((item) => item.current_stock > 0);
    }

    // Filtro de quantidade mínima
    if (minQuantity && !isNaN(parseFloat(minQuantity))) {
      filtered = filtered.filter((item) => item.current_stock >= parseFloat(minQuantity));
    }

    // Filtro de valor mínimo
    if (minValue && !isNaN(parseFloat(minValue))) {
      filtered = filtered.filter(
        (item) => item.current_stock * item.avg_purchase_price >= parseFloat(minValue)
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.material_name.localeCompare(b.material_name, "pt-BR");
        case "quantity":
          return b.current_stock - a.current_stock;
        case "value":
          return (
            b.current_stock * b.avg_purchase_price - a.current_stock * a.avg_purchase_price
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [stock, searchTerm, showOnlyInStock, sortBy, minQuantity, minValue]);

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSearchTerm("");
    setShowOnlyInStock(false);
    setSortBy("name");
    setMinQuantity("");
    setMinValue("");
  };

  return {
    stock,
    filteredStock,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    showOnlyInStock,
    setShowOnlyInStock,
    sortBy,
    setSortBy,
    minQuantity,
    setMinQuantity,
    minValue,
    setMinValue,
    clearFilters,
  };
};
