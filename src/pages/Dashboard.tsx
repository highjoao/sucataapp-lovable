import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, TrendingUp, Package, DollarSign } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSales: 0,
    totalProfit: 0,
    materialsCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [materialData, setMaterialData] = useState<any[]>([]);

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

      // Get monthly data for charts
      const { data: monthlySales } = await supabase
        .from("sales")
        .select("sale_date, total_price, profit")
        .eq("user_id", user.id)
        .order("sale_date");

      const { data: monthlyPurchases } = await supabase
        .from("purchases")
        .select("purchase_date, total_price")
        .eq("user_id", user.id)
        .order("purchase_date");

      // Aggregate by month
      const monthlyMap = new Map();
      
      monthlyPurchases?.forEach(p => {
        const month = new Date(p.purchase_date).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month, compras: 0, vendas: 0, lucro: 0 });
        }
        const data = monthlyMap.get(month);
        data.compras += Number(p.total_price);
      });

      monthlySales?.forEach(s => {
        const month = new Date(s.sale_date).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month, compras: 0, vendas: 0, lucro: 0 });
        }
        const data = monthlyMap.get(month);
        data.vendas += Number(s.total_price);
        data.lucro += Number(s.profit);
      });

      setMonthlyData(Array.from(monthlyMap.values()));

      // Get material performance
      const { data: materialStats } = await supabase
        .from("sales")
        .select(`
          material_id,
          total_price,
          profit,
          materials (name)
        `)
        .eq("user_id", user.id);

      const materialMap = new Map();
      materialStats?.forEach((s: any) => {
        const name = s.materials.name;
        if (!materialMap.has(name)) {
          materialMap.set(name, { material: name, vendas: 0, lucro: 0 });
        }
        const data = materialMap.get(name);
        data.vendas += Number(s.total_price);
        data.lucro += Number(s.profit);
      });

      setMaterialData(Array.from(materialMap.values()).slice(0, 5));
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Movimentação Mensal</CardTitle>
            <CardDescription>Comparativo de compras, vendas e lucro</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
                <Legend />
                <Line type="monotone" dataKey="compras" stroke="#3b82f6" name="Compras" strokeWidth={2} />
                <Line type="monotone" dataKey="vendas" stroke="#10b981" name="Vendas" strokeWidth={2} />
                <Line type="monotone" dataKey="lucro" stroke="hsl(var(--primary))" name="Lucro" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Material</CardTitle>
            <CardDescription>Top 5 materiais mais lucrativos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materialData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="material" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="vendas" fill="#10b981" name="Vendas" />
                <Bar dataKey="lucro" fill="hsl(var(--primary))" name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
