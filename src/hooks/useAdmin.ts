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
    } | null;
};

export const useAdmin = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery({
        queryKey: ["admin-users"],
        queryFn: async () => {
            // Fetch profiles with subscriptions
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select(`
                    *,
                    subscriptions (
                        plan_type,
                        status
                    )
                `)
                .order("created_at", { ascending: false });

            if (profilesError) throw profilesError;

            // Fetch all user roles from the separate user_roles table
            const { data: userRoles, error: rolesError } = await supabase
                .from("user_roles")
                .select("user_id, role");

            if (rolesError) throw rolesError;

            // Create a map of user_id to role
            const roleMap = new Map<string, string>();
            userRoles?.forEach((ur: any) => {
                // If user has admin role, mark as admin
                if (ur.role === "admin") {
                    roleMap.set(ur.user_id, "admin");
                } else if (!roleMap.has(ur.user_id)) {
                    roleMap.set(ur.user_id, ur.role);
                }
            });

            // Transform data to include role from user_roles table
            return profiles.map((user: any) => ({
                ...user,
                role: roleMap.get(user.id) || "user",
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
            if (role === "admin") {
                // Add admin role
                const { error } = await supabase
                    .from("user_roles")
                    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

                if (error) throw error;
            } else {
                // Remove admin role
                const { error } = await supabase
                    .from("user_roles")
                    .delete()
                    .eq("user_id", userId)
                    .eq("role", "admin");

                if (error) throw error;
            }
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
