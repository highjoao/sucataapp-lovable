import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  Recycle, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  DollarSign,
  LogOut,
  ArrowLeftRight,
  Crown,
  Sparkles,
  Menu
} from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const { state } = useSidebar();

  const navItems = [
    { to: "/dashboard", icon: Package, label: "Dashboard", locked: false },
    { to: "/purchases", icon: ShoppingCart, label: "Compras", locked: true },
    { to: "/sales", icon: TrendingUp, label: "Vendas", locked: true },
    { to: "/stock", icon: Package, label: "Estoque", locked: true },
    { to: "/transactions", icon: ArrowLeftRight, label: "Movimentações", locked: true },
    { to: "/quotes", icon: DollarSign, label: "Cotação", locked: false },
  ];

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r bg-card">
      <SidebarContent className="bg-card">
        {!isPro && !isCollapsed && (
          <div className="p-3 border-b bg-card">
            <Button
              onClick={() => navigate('/plans')}
              size="sm"
              className="w-full"
              variant="default"
            >
              <Crown className="mr-2 h-3 w-3" />
              Upgrade Pro
            </Button>
          </div>
        )}
        
        <SidebarGroup className="bg-card">
          <SidebarGroupContent className="bg-card">
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                const isLocked = item.locked && !isPro;

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      onClick={(e) => {
                        if (isLocked) {
                          e.preventDefault();
                          toast({
                            title: "Recurso Bloqueado",
                            description: "Atualize para o Plano Pro",
                            variant: "destructive",
                          });
                        }
                      }}
                      className={isLocked ? 'opacity-50' : ''}
                    >
                      <Link to={item.to}>
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                        {isLocked && <Crown className="ml-auto h-4 w-4 text-primary" />}
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

const Layout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isPro } = useSubscription();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-50 border-b bg-card">
            <div className="flex h-14 items-center gap-4 px-4">
              <SidebarTrigger className="h-8 w-8" />
              <div className="flex items-center gap-3 flex-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Recycle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-lg font-bold">SucataApp</span>
                  {isPro && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-medium">Pro</span>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
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
    </SidebarProvider>
  );
};

export default Layout;
