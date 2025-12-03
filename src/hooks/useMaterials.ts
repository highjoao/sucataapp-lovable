import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Material = Tables<"materials">;
type MaterialInsert = TablesInsert<"materials">;
type MaterialUpdate = TablesUpdate<"materials">;

export const useMaterials = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all materials
  const { data: materials = [], isLoading, error, refetch } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      return data as Material[];
    },
  });

  // Create material
  const createMaterial = useMutation({
    mutationFn: async (materialData: Omit<MaterialInsert, "user_id" | "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("materials")
        .insert({ ...materialData, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Material criado!",
        description: "Material cadastrado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar material",
        description: error.message || "Ocorreu um erro ao cadastrar o material.",
        variant: "destructive",
      });
    },
  });

  // Update material
  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: MaterialUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("materials")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Material atualizado!",
        description: "Material atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar material",
        description: error.message || "Ocorreu um erro ao atualizar o material.",
        variant: "destructive",
      });
    },
  });

  // Delete material
  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("materials")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({
        title: "Material excluído!",
        description: "Material excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir material",
        description: error.message || "Ocorreu um erro ao excluir o material.",
        variant: "destructive",
      });
    },
  });

  return {
    materials,
    isLoading,
    error,
    refetch,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    isCreating: createMaterial.isPending,
    isUpdating: updateMaterial.isPending,
    isDeleting: deleteMaterial.isPending,
  };
};
