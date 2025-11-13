import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { ShoppingCart, TrendingUp, Package, DollarSign, CheckCircle2, ArrowUpDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { QuotesWidget } from "@/components/QuotesWidget";

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { refreshSubscription } = useSubscription();
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSales: 0,
    totalProfit: 0,
    materialsCount: 0,
    monthTransactions: 0,
    stockValue: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [materialData, setMaterialData] = useState<any[]>([]);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    
    if (success === 'true') {
      setShowSuccessAlert(true);
      toast({
        title: "Assinatura Ativada!",
        description: "Bem-vindo ao Plano Pro. Todos os recursos foram desbloqueados!",
      });
      
      // Atualizar status da assinatura
      setTimeout(() => {
        refreshSubscription();
      }, 2000);
      
      // Limpar parâmetro da URL
      setSearchParams({});
      
      // Esconder alerta após 10 segundos
      setTimeout(() => {
        setShowSuccessAlert(false);
      }, 10000);
    }
  }, [searchParams, toast, refreshSubscription, setSearchParams]);

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

      // Get transactions this month
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: monthTransactions } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("transaction_date", firstDayOfMonth);

      // Get stock value (sum of current stock * average purchase price)
      const { data: stockData } = await supabase
        .from("stock")
        .select(`
          quantity,
          materials (
            id,
            name
          )
        `)
        .eq("user_id", user.id);

      let stockValue = 0;
      if (stockData) {
        for (const item of stockData) {
          if (item.materials) {
            const { data: avgPrice } = await supabase
              .from("purchases")
              .select("unit_price")
              .eq("material_id", (item.materials as any).id)
              .eq("user_id", user.id);
            
            if (avgPrice && avgPrice.length > 0) {
              const avg = avgPrice.reduce((sum, p) => sum + Number(p.unit_price), 0) / avgPrice.length;
              stockValue += Number(item.quantity) * avg;
            }
          }
        }
      }

      setStats({
        totalPurchases,
        totalSales,
        totalProfit,
        materialsCount: materialsCount || 0,
        monthTransactions: monthTransactions || 0,
        stockValue,
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
      title: "Valor em Estoque",
      value: `R$ ${stats.stockValue.toFixed(2)}`,
      description: "Valor atual do estoque",
      icon: Package,
      iconColor: "text-orange-500",
    },
    {
      title: "Transações do Mês",
      value: stats.monthTransactions.toString(),
      description: "Compras e vendas",
      icon: ArrowUpDown,
      iconColor: "text-purple-500",
    },
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
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      {showSuccessAlert && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">Assinatura Pro Ativada!</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Parabéns! Agora você tem acesso completo a todos os recursos do SucataApp.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
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

        <div>
          <QuotesWidget />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
