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
  Sparkles
} from "lucide-react";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const navItems = [
    { to: "/dashboard", icon: Package, label: "Dashboard", locked: false },
    { to: "/purchases", icon: ShoppingCart, label: "Compras", locked: true },
    { to: "/sales", icon: TrendingUp, label: "Vendas", locked: true },
    { to: "/stock", icon: Package, label: "Estoque", locked: true },
    { to: "/transactions", icon: ArrowLeftRight, label: "Movimentações", locked: true },
    { to: "/quotes", icon: DollarSign, label: "Cotação", locked: false },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Recycle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold">SucataApp</span>
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
      <div className="flex flex-1">
        <aside className="w-64 border-r bg-card flex flex-col">
          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              const isLocked = item.locked && !isPro;
              
              return (
                <div key={item.to} className="relative">
                  <Link 
                    to={item.to}
                    onClick={(e) => {
                      if (isLocked) {
                        e.preventDefault();
                        toast({
                          title: "Recurso Bloqueado",
                          description: "Atualize para o Plano Pro para acessar este recurso",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start ${isLocked ? 'opacity-50' : ''}`}
                    >
                      <Icon className="mr-2 h-5 w-5" />
                      {item.label}
                      {isLocked && <Crown className="ml-auto h-4 w-4 text-primary" />}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </nav>

          {!isPro && (
            <div className="p-4 border-t">
              <Button
                onClick={() => navigate('/plans')}
                className="w-full"
                variant="default"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade para Pro
              </Button>
            </div>
          )}
        </aside>
        <main className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
