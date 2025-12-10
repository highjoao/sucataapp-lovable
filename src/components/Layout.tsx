import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import {
  Recycle,
  ShoppingCart,
  TrendingUp,
  Package,
  LogOut,
  ArrowLeftRight,
  Boxes,
  Truck,
  Users,
  LayoutDashboard,
  DollarSign,
  Shield
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";

const AppSidebar = () => {
  const location = useLocation();

  const { data: profile } = useQuery({
    queryKey: ["profile-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      return data;
    }
  });

  const navItems = [
    { to: "/cashflow", icon: DollarSign, label: "Fluxo de Caixa", color: "text-emerald-500" },
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", color: "text-blue-500" },
    { to: "/purchases", icon: ShoppingCart, label: "Compras", color: "text-orange-500" },
    { to: "/sales", icon: TrendingUp, label: "Vendas", color: "text-green-500" },
    { to: "/transactions", icon: ArrowLeftRight, label: "Movimentações", color: "text-purple-500" },
    { to: "/stock", icon: Package, label: "Estoque", color: "text-amber-500" },
    { to: "/clients", icon: Users, label: "Clientes", color: "text-indigo-500" },
    { to: "/suppliers", icon: Truck, label: "Fornecedores", color: "text-cyan-500" },
    { to: "/materials", icon: Boxes, label: "Materiais", color: "text-pink-500" },
  ];

  // @ts-ignore
  if (profile?.role === 'admin') {
    navItems.push({ to: "/admin/users", icon: Shield, label: "Admin", color: "text-red-500" });
  }

  return (
    <Sidebar collapsible="icon" className="border-r bg-card">
      <SidebarContent className="bg-card">
        <SidebarGroup className="bg-card">
          <SidebarGroupContent className="bg-card">
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.to} className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${item.color}`} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const LayoutContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  }, [location.pathname, setOpen, setOpenMobile, isMobile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-50 bg-primary shadow-md">
          <div className="flex h-16 items-center gap-4 px-6">
            <SidebarTrigger className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" />
            <div className="flex items-center gap-3 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10">
                <Recycle className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold text-primary-foreground">SucataApp</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const Layout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default Layout;
