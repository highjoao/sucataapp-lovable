import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Tipos definidos manualmente pois os tipos gerados podem não estar atualizados ainda
type Client = {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    user_id: string;
    created_at: string;
};

type ClientInsert = Omit<Client, "id" | "created_at">;
type ClientUpdate = Partial<ClientInsert>;

export const useClients = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all clients
    const { data: clients = [], isLoading, error, refetch } = useQuery({
        queryKey: ["clients"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data, error } = await (supabase as any)
                .from("clients")
                .select("*")
                .eq("user_id", user.id)
                .order("name");

            if (error) throw error;
            return data as Client[];
        },
    });

    // Create client
    const createClient = useMutation({
        mutationFn: async (clientData: Omit<ClientInsert, "user_id">) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const { data, error } = await (supabase as any)
                .from("clients")
                .insert({ ...clientData, user_id: user.id })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast({
                title: "Cliente criado!",
                description: "Cliente cadastrado com sucesso.",
            });
        },
        onError: (error: any) => {
            console.error("Erro ao criar cliente:", JSON.stringify(error, null, 2));

            const errorMessage = error.message || "Ocorreu um erro ao cadastrar o cliente.";
            const errorDetails = error.details || error.hint || "";
            const errorCode = error.code ? `Código: ${error.code}` : "";

            toast({
                title: "Erro ao criar cliente",
                description: `${errorMessage}${errorDetails ? ` - ${errorDetails}` : ""}${errorCode ? ` (${errorCode})` : ""}`,
                variant: "destructive",
            });
        },
    });

    // Update client
    const updateClient = useMutation({
        mutationFn: async ({ id, ...updates }: ClientUpdate & { id: string }) => {
            const { data, error } = await (supabase as any)
                .from("clients")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast({
                title: "Cliente atualizado!",
                description: "Cliente atualizado com sucesso.",
            });
        },
        onError: (error: any) => {
            console.error("Erro ao atualizar cliente:", JSON.stringify(error, null, 2));

            const errorMessage = error.message || "Ocorreu um erro ao atualizar o cliente.";
            const errorDetails = error.details || error.hint || "";
            const errorCode = error.code ? `Código: ${error.code}` : "";

            toast({
                title: "Erro ao atualizar cliente",
                description: `${errorMessage}${errorDetails ? ` - ${errorDetails}` : ""}${errorCode ? ` (${errorCode})` : ""}`,
                variant: "destructive",
            });
        },
    });

    // Delete client
    const deleteClient = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from("clients")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            toast({
                title: "Cliente excluído!",
                description: "Cliente excluído com sucesso.",
            });
        },
        onError: (error: any) => {
            console.error("Erro ao excluir cliente:", JSON.stringify(error, null, 2));

            const errorMessage = error.message || "Ocorreu um erro ao excluir o cliente.";
            const errorDetails = error.details || error.hint || "";
            const errorCode = error.code ? `Código: ${error.code}` : "";

            toast({
                title: "Erro ao excluir cliente",
                description: `${errorMessage}${errorDetails ? ` - ${errorDetails}` : ""}${errorCode ? ` (${errorCode})` : ""}`,
                variant: "destructive",
            });
        },
    });

    return {
        clients,
        isLoading,
        error,
        refetch,
        createClient: createClient.mutate,
        updateClient: updateClient.mutate,
        deleteClient: deleteClient.mutate,
        isCreating: createClient.isPending,
        isUpdating: updateClient.isPending,
        isDeleting: deleteClient.isPending,
    };
};
