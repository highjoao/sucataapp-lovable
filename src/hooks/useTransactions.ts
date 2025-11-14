import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions"> & {
  materials?: { name: string; unit_of_measure: string };
  suppliers?: { name: string } | null;
};
type TransactionInsert = TablesInsert<"transactions">;

export const useTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all transactions with filters
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          materials (name, unit_of_measure),
          suppliers (name)
        `)
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  // Create transaction (triggers stock update automatically)
  const createTransaction = useMutation({
    mutationFn: async (transactionData: Omit<TransactionInsert, "user_id" | "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Validate that material belongs to user
      const { data: material, error: materialError } = await supabase
        .from("materials")
        .select("id")
        .eq("id", transactionData.material_id)
        .eq("user_id", user.id)
        .single();

      if (materialError || !material) {
        throw new Error("Material não encontrado ou não pertence ao usuário");
      }

      // Validate supplier if provided
      if (transactionData.supplier_id) {
        const { data: supplier, error: supplierError } = await supabase
          .from("suppliers")
          .select("id")
          .eq("id", transactionData.supplier_id)
          .eq("user_id", user.id)
          .single();

        if (supplierError || !supplier) {
          throw new Error("Fornecedor não encontrado ou não pertence ao usuário");
        }
      }

      // Insert transaction (trigger will update stock automatically)
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...transactionData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast({
        title: "Transação registrada!",
        description: `${data.type === "BUY" ? "Compra" : "Venda"} registrada e estoque atualizado automaticamente.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar transação",
        description: error.message || "Ocorreu um erro ao registrar a transação.",
        variant: "destructive",
      });
    },
  });



  return {
    transactions,

    isLoading,

    error,
    createTransaction: createTransaction.mutate,
    isCreating: createTransaction.isPending,
  };
};
