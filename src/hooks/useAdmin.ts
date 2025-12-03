import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type AdminUser = {
    id: string;
    full_name: string | null;
    role: "admin" | "user";
    is_blocked: boolean;
    last_seen: string | null;
    created_at: string;
    subscriptions: {
        plan_type: string;
        status: string;
    } | null; // Assuming one-to-one or taking the first one
};

export const useAdmin = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ["admin-users"],
        queryFn: async () => {
            // Fetch profiles and join with subscriptions
            // Note: This requires the foreign key relationship to be detected by Supabase client
            // If not, we might need to fetch separately or use a view.
            // Assuming 'subscriptions' has user_id FK to profiles(id)
            const { data, error } = await supabase
                .from("profiles")
                .select(`
          *,
          subscriptions (
            plan_type,
            status
          )
        `)
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Transform data to flatten subscription (take the first one if array)
            return data.map((user: any) => ({
                ...user,
                subscriptions: user.subscriptions?.[0] || user.subscriptions || null,
            })) as AdminUser[];
        },
    });

    const toggleBlockUser = useMutation({
        mutationFn: async ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => {
            const { error } = await supabase
                .from("profiles")
                .update({ is_blocked: isBlocked })
                .eq("id", userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast({ title: "Status do usuário atualizado!" });
        },
        onError: (error: any) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        },
    });

    const updateUserRole = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
            const { error } = await supabase
                .from("profiles")
                .update({ role })
                .eq("id", userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast({ title: "Função do usuário atualizada!" });
        },
        onError: (error: any) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        },
    });

    return {
        users,
        isLoading,
        toggleBlockUser,
        updateUserRole,
    };
};
