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

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("Error checking admin status:", error);
                setIsAdmin(false);
                return;
            }

            // @ts-ignore - 'role' might not be in the generated types yet
            if (profile?.role === "admin") {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
                // Only show toast if we are actually blocking access (i.e. not just initial load)
                // But here we are inside the effect, so it runs once.
                // We might want to avoid showing toast on every mount if the user is just navigating elsewhere,
                // but since this component wraps the route, it only mounts when trying to access the route.
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
