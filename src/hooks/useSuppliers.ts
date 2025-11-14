import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Supplier = Tables<"suppliers">;
type SupplierInsert = TablesInsert<"suppliers">;
type SupplierUpdate = TablesUpdate<"suppliers">;

export const useSuppliers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all suppliers
  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      return data as Supplier[];
    },
  });

  // Create supplier
  const createSupplier = useMutation({
    mutationFn: async (supplierData: Omit<SupplierInsert, "user_id" | "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...supplierData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({
        title: "Fornecedor criado!",
        description: "Fornecedor cadastrado com sucesso.",
      });
    },
    onError: (error: any) => {
      // Log detalhado do erro no console para diagnóstico
      console.error("Erro ao criar fornecedor:", JSON.stringify(error, null, 2));
      console.error("Detalhes completos do erro:", error);

      // Construir mensagem de erro detalhada
      const errorMessage = error.message || "Ocorreu um erro ao cadastrar o fornecedor.";
      const errorDetails = error.details || error.hint || "";
      const errorCode = error.code ? `Código: ${error.code}` : "";

      toast({
        title: "Erro ao criar fornecedor",
        description: `${errorMessage}${errorDetails ? ` - ${errorDetails}` : ""}${errorCode ? ` (${errorCode})` : ""}`,
        variant: "destructive",
      });
    },
  });

  // Update supplier
  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...updates }: SupplierUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({
        title: "Fornecedor atualizado!",
        description: "Fornecedor atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      // Log detalhado do erro no console para diagnóstico
      console.error("Erro ao atualizar fornecedor:", JSON.stringify(error, null, 2));
      console.error("Detalhes completos do erro:", error);

      // Construir mensagem de erro detalhada
      const errorMessage = error.message || "Ocorreu um erro ao atualizar o fornecedor.";
      const errorDetails = error.details || error.hint || "";
      const errorCode = error.code ? `Código: ${error.code}` : "";

      toast({
        title: "Erro ao atualizar fornecedor",
        description: `${errorMessage}${errorDetails ? ` - ${errorDetails}` : ""}${errorCode ? ` (${errorCode})` : ""}`,
        variant: "destructive",
      });
    },
  });

  // Delete supplier
  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({
        title: "Fornecedor excluído!",
        description: "Fornecedor excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      // Log detalhado do erro no console para diagnóstico
      console.error("Erro ao excluir fornecedor:", JSON.stringify(error, null, 2));
      console.error("Detalhes completos do erro:", error);

      // Construir mensagem de erro detalhada
      const errorMessage = error.message || "Ocorreu um erro ao excluir o fornecedor.";
      const errorDetails = error.details || error.hint || "";
      const errorCode = error.code ? `Código: ${error.code}` : "";

      toast({
        title: "Erro ao excluir fornecedor",
        description: `${errorMessage}${errorDetails ? ` - ${errorDetails}` : ""}${errorCode ? ` (${errorCode})` : ""}`,
        variant: "destructive",
      });
    },
  });

  return {
    suppliers,
    isLoading,
    error,
    createSupplier: createSupplier.mutate,
    updateSupplier: updateSupplier.mutate,
    deleteSupplier: deleteSupplier.mutate,
    isCreating: createSupplier.isPending,
    isUpdating: updateSupplier.isPending,
    isDeleting: deleteSupplier.isPending,
  };
};
