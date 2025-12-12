import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AdminRoute = () => {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsAdmin(false);
                return;
            }

            // Use the secure is_admin() database function
            const { data, error } = await supabase.rpc("is_admin", { user_id: user.id });

            if (error) {
                console.error("Error checking admin status:", error);
                setIsAdmin(false);
                return;
            }

            if (data === true) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
                toast({
                    title: "Acesso Negado",
                    description: "Você não tem permissão de administrador.",
                    variant: "destructive"
                });
            }
        };

        checkAdmin();
    }, [toast]);

    if (isAdmin === null) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
};
