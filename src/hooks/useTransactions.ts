import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// Unified Transaction Type
export type Transaction = {
  id: string;
  type: "BUY" | "SELL";
  transaction_date: string;
  material_id: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  supplier_id: string | null;
  materials?: { name: string; unit_of_measure: string };
  suppliers?: { name: string } | null;
  source: "sales" | "purchases" | "transactions";
  notes?: string | null;
  profit?: number;
  cost_price?: number;
};

export const useTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all transactions (merged)
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Fetch Purchases
      const { data: purchases } = await supabase
        .from("purchases")
        .select(`*, materials(name, unit_of_measure), suppliers(name)`)
        .eq("user_id", user.id);

      // Fetch Sales
      const { data: sales } = await supabase
        .from("sales")
        .select(`*, materials(name, unit_of_measure), suppliers(name)`)
        .eq("user_id", user.id);

      const merged: Transaction[] = [];

      purchases?.forEach(p => merged.push({
        id: p.id,
        type: "BUY",
        transaction_date: p.purchase_date,
        material_id: p.material_id,
        quantity: Number(p.quantity),
        price_per_unit: Number(p.unit_price),
        total_price: Number(p.total_price),
        supplier_id: p.supplier_id,
        materials: p.materials,
        suppliers: p.suppliers,
        source: "purchases",
        notes: p.notes
      }));

      sales?.forEach(s => merged.push({
        id: s.id,
        type: "SELL",
        transaction_date: s.sale_date,
        material_id: s.material_id,
        quantity: Number(s.quantity),
        price_per_unit: Number(s.unit_price),
        total_price: Number(s.total_price),
        supplier_id: s.supplier_id,
        materials: s.materials,
        suppliers: s.suppliers,
        source: "sales",
        notes: s.notes,
        profit: Number(s.profit),
        cost_price: Number(s.cost_price)
      }));

      return merged.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
    },
  });

  // Create Transaction
  const createTransaction = useMutation({
    mutationFn: async (formData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { type, material_id, supplier_id, quantity, price_per_unit, transaction_date } = formData;
      const totalPrice = quantity * price_per_unit;

      if (type === "SELL") {
        // Only insert into sales. Stock update and cost/profit calculation are handled by DB triggers.
        const { data, error } = await supabase.from("sales").insert({
          user_id: user.id,
          material_id,
          supplier_id: supplier_id || null,
          quantity,
          unit_price: price_per_unit,
          total_price: totalPrice,
          sale_date: transaction_date,
          notes: null,
          // cost_price and profit will be calculated by the trigger
          cost_price: 0,
          profit: 0
        }).select().single();

        if (error) throw error;
        return data;
      } else {
        // Only insert into purchases. Stock update is handled by DB triggers.
        const { data, error } = await supabase.from("purchases").insert({
          user_id: user.id,
          material_id,
          supplier_id: supplier_id || null,
          quantity,
          unit_price: price_per_unit,
          total_price: totalPrice,
          purchase_date: transaction_date,
          notes: null
        }).select().single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stockData"] });
      toast({ title: "Transação registrada!", description: "Estoque será atualizado automaticamente." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  // Delete Transaction
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Try fetching from sales
      let { data: sale } = await supabase.from("sales").select("id").eq("id", id).single();
      if (sale) {
        // Just delete. Trigger handles stock reversion.
        await supabase.from("sales").delete().eq("id", id);
        return;
      }

      // Try fetching from purchases
      let { data: purchase } = await supabase.from("purchases").select("id").eq("id", id).single();
      if (purchase) {
        // Just delete. Trigger handles stock reversion.
        await supabase.from("purchases").delete().eq("id", id);
        return;
      }

      // Try fetching from transactions
      let { data: transaction } = await supabase.from("transactions").select("id").eq("id", id).single();
      if (transaction) {
        // Legacy transactions might not have triggers, but we are moving away from them.
        // For now, just delete.
        await supabase.from("transactions").delete().eq("id", id);
        return;
      }

      throw new Error("Transação não encontrada");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stockData"] });
      toast({ title: "Transação excluída!", description: "Estoque atualizado." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  // Update Transaction
  const updateTransaction = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Try sales
      let { data: sale } = await supabase.from("sales").select("*").eq("id", id).single();
      if (sale) {
        const qty = data.quantity || sale.quantity;
        const price = data.price_per_unit || sale.unit_price;
        const total = qty * price;

        // Just update. Trigger handles stock adjustment and cost/profit recalculation.
        await supabase.from("sales").update({
          quantity: qty,
          unit_price: price,
          total_price: total,
          notes: data.notes
        }).eq("id", id);
        return;
      }

      // Try purchases
      let { data: purchase } = await supabase.from("purchases").select("*").eq("id", id).single();
      if (purchase) {
        const qty = data.quantity || purchase.quantity;
        const price = data.price_per_unit || purchase.unit_price;
        const total = qty * price;

        // Just update. Trigger handles stock adjustment.
        await supabase.from("purchases").update({
          quantity: qty,
          unit_price: price,
          total_price: total,
          notes: data.notes
        }).eq("id", id);
        return;
      }

      // Try transactions
      let { data: transaction } = await supabase.from("transactions").select("*").eq("id", id).single();
      if (transaction) {
        await supabase.from("transactions").update({
          quantity: data.quantity,
          price_per_unit: data.price_per_unit
        }).eq("id", id);
        return;
      }

      throw new Error("Transação não encontrada");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["stockData"] });
      toast({ title: "Transação atualizada!", description: "Estoque atualizado." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
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
