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
      queryClient.invalidateQueries({ queryKey: ["stockData"] });
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

  // Delete transaction (reverts stock changes)
  const deleteTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get transaction details before deleting
      const { data: transaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !transaction) {
        throw new Error("Transação não encontrada");
      }

      // Revert stock changes
      const stockChange = transaction.type === "BUY" 
        ? -transaction.quantity 
        : transaction.quantity;

      const { data: currentStock } = await supabase
        .from("stock")
        .select("quantity")
        .eq("material_id", transaction.material_id)
        .single();

      if (currentStock) {
        const newQuantity = Number(currentStock.quantity) + stockChange;
        
        if (newQuantity < 0) {
          throw new Error("Não é possível excluir: resultaria em estoque negativo");
        }

        await supabase
          .from("stock")
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq("material_id", transaction.material_id);
      }

      // Delete transaction
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user.id);

      if (error) throw error;
      return transaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stockData"] });
      toast({
        title: "Transação excluída!",
        description: `${data.type === "BUY" ? "Compra" : "Venda"} removida e estoque atualizado.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir transação",
        description: error.message || "Ocorreu um erro ao excluir a transação.",
        variant: "destructive",
      });
    },
  });

  // Update transaction
  const updateTransaction = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TransactionInsert> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Get old transaction to revert stock
      const { data: oldTransaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !oldTransaction) {
        throw new Error("Transação não encontrada");
      }

      // Revert old stock changes
      const oldStockChange = oldTransaction.type === "BUY" 
        ? -oldTransaction.quantity 
        : oldTransaction.quantity;

      const { data: currentStock } = await supabase
        .from("stock")
        .select("quantity")
        .eq("material_id", oldTransaction.material_id)
        .single();

      if (currentStock) {
        await supabase
          .from("stock")
          .update({ 
            quantity: Number(currentStock.quantity) + oldStockChange,
            updated_at: new Date().toISOString() 
          })
          .eq("material_id", oldTransaction.material_id);
      }

      // Update transaction
      const { data: updated, error } = await supabase
        .from("transactions")
        .update(data)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Apply new stock changes
      const newStockChange = (data.type || oldTransaction.type) === "BUY" 
        ? (data.quantity || oldTransaction.quantity)
        : -(data.quantity || oldTransaction.quantity);

      const { data: newCurrentStock } = await supabase
        .from("stock")
        .select("quantity")
        .eq("material_id", data.material_id || oldTransaction.material_id)
        .single();

      if (newCurrentStock) {
        const finalQuantity = Number(newCurrentStock.quantity) + newStockChange;
        
        if (finalQuantity < 0) {
          throw new Error("Atualização resultaria em estoque negativo");
        }

        await supabase
          .from("stock")
          .update({ 
            quantity: finalQuantity,
            updated_at: new Date().toISOString() 
          })
          .eq("material_id", data.material_id || oldTransaction.material_id);
      }

      return updated;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stockData"] });
      toast({
        title: "Transação atualizada!",
        description: "Estoque atualizado automaticamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar transação",
        description: error.message || "Ocorreu um erro ao atualizar a transação.",
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
    deleteTransaction: deleteTransaction.mutate,
    isDeleting: deleteTransaction.isPending,
    updateTransaction: updateTransaction.mutate,
    isUpdating: updateTransaction.isPending,
  };
};
