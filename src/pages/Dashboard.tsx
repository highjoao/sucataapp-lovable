import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { ShoppingCart, TrendingUp, Package, DollarSign, CheckCircle2, ArrowUpDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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
  const [purchasePieData, setPurchasePieData] = useState<any[]>([]);
  const [salesPieData, setSalesPieData] = useState<any[]>([]);
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
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { count: monthTransactions } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("transaction_date", firstDayOfMonth)
        .lte("transaction_date", lastDayOfMonth);

      // Get stock value (sum of current stock * last purchase price)
      const { data: stockData } = await supabase
        .from("stock")
        .select(`
          quantity,
          materials (
            id,
            name
          )
        `)
        .eq("user_id", user.id)
        .gt("quantity", 0);

      let stockValue = 0;
      if (stockData) {
        for (const item of stockData) {
          if (item.materials && Number(item.quantity) > 0) {
            // Buscar última compra deste material
            const { data: lastPurchase } = await supabase
              .from("purchases")
              .select("unit_price")
              .eq("material_id", (item.materials as any).id)
              .eq("user_id", user.id)
              .order("purchase_date", { ascending: false })
              .limit(1)
              .single();
            
            if (lastPurchase) {
              stockValue += Number(item.quantity) * Number(lastPurchase.unit_price);
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

      // Get purchase distribution by material
      const { data: purchasesByMaterial } = await supabase
        .from("purchases")
        .select(`
          material_id,
          quantity,
          total_price,
          materials (name)
        `)
        .eq("user_id", user.id);

      const purchaseMap = new Map();
      purchasesByMaterial?.forEach((p: any) => {
        const name = p.materials.name;
        if (!purchaseMap.has(name)) {
          purchaseMap.set(name, { name, value: 0 });
        }
        const data = purchaseMap.get(name);
        data.value += Number(p.total_price);
      });

      const topPurchases = Array.from(purchaseMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      setPurchasePieData(topPurchases);

      // Get sales distribution by material
      const { data: salesByMaterial } = await supabase
        .from("sales")
        .select(`
          material_id,
          quantity,
          total_price,
          materials (name)
        `)
        .eq("user_id", user.id);

      const salesMap = new Map();
      salesByMaterial?.forEach((s: any) => {
        const name = s.materials.name;
        if (!salesMap.has(name)) {
          salesMap.set(name, { name, value: 0 });
        }
        const data = salesMap.get(name);
        data.value += Number(s.total_price);
      });

      const topSales = Array.from(salesMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
      setSalesPieData(topSales);
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
      link: "/stock",
    },
    {
      title: "Transações do Mês",
      value: stats.monthTransactions.toString(),
      description: "Compras e vendas",
      icon: ArrowUpDown,
      iconColor: "text-purple-500",
      link: "/transactions",
    },
    {
      title: "Total de Compras",
      value: `R$ ${stats.totalPurchases.toFixed(2)}`,
      description: "Valor total investido",
      icon: ShoppingCart,
      iconColor: "text-blue-500",
      link: "/transactions?type=BUY",
    },
    {
      title: "Total de Vendas",
      value: `R$ ${stats.totalSales.toFixed(2)}`,
      description: "Valor total vendido",
      icon: TrendingUp,
      iconColor: "text-green-500",
      link: "/transactions?type=SELL",
    },
    {
      title: "Lucro Total",
      value: `R$ ${stats.totalProfit.toFixed(2)}`,
      description: "Lucro acumulado",
      icon: DollarSign,
      iconColor: "text-primary",
      link: "/sales",
    },
    {
      title: "Materiais",
      value: stats.materialsCount.toString(),
      description: "Tipos cadastrados",
      icon: Package,
      iconColor: "text-amber-500",
      link: "/materials",
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
            <Link key={stat.title} to={stat.link} className="block transition-transform hover:scale-105">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Compras</CardTitle>
            <CardDescription>Top 8 materiais mais comprados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={purchasePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {purchasePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Vendas</CardTitle>
            <CardDescription>Top 8 materiais mais vendidos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {salesPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
      </div>
    </div>
  );
};

export default Dashboard;
