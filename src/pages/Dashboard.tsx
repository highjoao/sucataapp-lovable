import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, TrendingUp, Package, DollarSign } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSales: 0,
    totalProfit: 0,
    materialsCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get purchases total
      const { data: purchases } = await supabase
        .from("purchases")
        .select("total_price")
        .eq("user_id", user.id);
      
      const totalPurchases = purchases?.reduce((sum, p) => sum + Number(p.total_price), 0) || 0;

      // Get sales total and profit
      const { data: sales } = await supabase
        .from("sales")
        .select("total_price, profit")
        .eq("user_id", user.id);
      
      const totalSales = sales?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
      const totalProfit = sales?.reduce((sum, s) => sum + Number(s.profit), 0) || 0;

      // Get materials count
      const { count: materialsCount } = await supabase
        .from("materials")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setStats({
        totalPurchases,
        totalSales,
        totalProfit,
        materialsCount: materialsCount || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total de Compras",
      value: `R$ ${stats.totalPurchases.toFixed(2)}`,
      description: "Valor total investido",
      icon: ShoppingCart,
      iconColor: "text-blue-500",
    },
    {
      title: "Total de Vendas",
      value: `R$ ${stats.totalSales.toFixed(2)}`,
      description: "Valor total vendido",
      icon: TrendingUp,
      iconColor: "text-green-500",
    },
    {
      title: "Lucro Total",
      value: `R$ ${stats.totalProfit.toFixed(2)}`,
      description: "Lucro acumulado",
      icon: DollarSign,
      iconColor: "text-primary",
    },
    {
      title: "Materiais",
      value: stats.materialsCount.toString(),
      description: "Tipos cadastrados",
      icon: Package,
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
