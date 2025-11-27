import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { ShoppingCart, TrendingUp, Package, DollarSign, CheckCircle2, ArrowUpDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { refreshSubscription } = useSubscription();
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalSales: 0,
    totalProfit: 0,
    materialsCount: 0,
    periodTransactions: 0,
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

      // Calculate date range
      const now = new Date();
      let start: Date, end: Date;

      switch (dateRange) {
        case "today":
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case "week":
          start = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
          end = endOfWeek(now, { weekStartsOn: 0 });
          break;
        case "month":
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
      }

      // Get purchases total
      const { data: purchases } = await supabase
        .from("purchases")
        .select("total_price")
        .eq("user_id", user.id)
        .gte("purchase_date", start.toISOString())
        .lte("purchase_date", end.toISOString());

      const totalPurchases = purchases?.reduce((sum, p) => sum + Number(p.total_price), 0) || 0;

      // Get sales total and profit
      const { data: sales } = await supabase
        .from("sales")
        .select("total_price, profit")
        .eq("user_id", user.id)
        .gte("sale_date", start.toISOString())
        .lte("sale_date", end.toISOString());

      const totalSales = sales?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
      const totalProfit = sales?.reduce((sum, s) => sum + Number(s.profit), 0) || 0;

      // Get materials count (Total, not filtered)
      const { count: materialsCount } = await supabase
        .from("materials")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Get transactions in period
      const { count: periodTransactions } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      // Get stock value (Current snapshot, not filtered)
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
        periodTransactions: periodTransactions || 0,
        stockValue,
      });

      // Get monthly data for charts (Always show last 6 months or current year context, maybe keep as is or filter?)
      // For charts, usually we want to see trends, so filtering by "Today" might break the line chart if it expects months.
      // Let's keep charts showing monthly data for context, or maybe adjust granularity?
      // The request was "Filtros no dashboard - Dia atual / semanal / mensal". Usually applies to the KPI cards.
      // I will keep the charts showing general trends but maybe limit the range if needed. 
      // For now, I'll leave the charts showing all history or maybe last 12 months to be safe, 
      // but the KPI cards will strictly follow the filter.

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

      // Get material performance (Filtered by date range)
      const { data: materialStats } = await supabase
        .from("sales")
        .select(`
          material_id,
          total_price,
          profit,
          materials (name)
        `)
        .eq("user_id", user.id)
        .gte("sale_date", start.toISOString())
        .lte("sale_date", end.toISOString());

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

      // Get purchase distribution by material (Filtered)
      const { data: purchasesByMaterial } = await supabase
        .from("purchases")
        .select(`
          material_id,
          quantity,
          total_price,
          materials (name)
        `)
        .eq("user_id", user.id)
        .gte("purchase_date", start.toISOString())
        .lte("purchase_date", end.toISOString());

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

      // Get sales distribution by material (Filtered)
      const { data: salesByMaterial } = await supabase
        .from("sales")
        .select(`
          material_id,
          quantity,
          total_price,
          materials (name)
        `)
        .eq("user_id", user.id)
        .gte("sale_date", start.toISOString())
        .lte("sale_date", end.toISOString());

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
  }, [dateRange]);

  const getPeriodLabel = () => {
    switch (dateRange) {
      case "today": return "Hoje";
      case "week": return "Esta Semana";
      case "month": return "Este Mês";
      default: return "";
    }
  };

  const statCards = [
    {
      title: "Valor em Estoque",
      value: formatCurrency(stats.stockValue),
      description: "Valor atual do estoque",
      icon: Package,
      iconColor: "text-orange-500",
      link: "/stock",
    },
    {
      title: getPeriodLabel() ? `Transações (${getPeriodLabel()})` : "Transações",
      value: stats.periodTransactions.toString(),
      description: "Compras e vendas",
      icon: ArrowUpDown,
      iconColor: "text-purple-500",
      link: "/transactions",
    },
    {
      title: `Compras (${getPeriodLabel()})`,
      value: formatCurrency(stats.totalPurchases),
      description: "Valor investido no período",
      icon: ShoppingCart,
      iconColor: "text-blue-500",
      link: "/transactions?type=BUY",
    },
    {
      title: `Vendas (${getPeriodLabel()})`,
      value: formatCurrency(stats.totalSales),
      description: "Valor vendido no período",
      icon: TrendingUp,
      iconColor: "text-green-500",
      link: "/transactions?type=SELL",
    },
    {
      title: `Lucro (${getPeriodLabel()})`,
      value: formatCurrency(stats.totalProfit),
      description: "Lucro no período",
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
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
            <CardDescription>Top 8 materiais mais comprados ({getPeriodLabel()})</CardDescription>
          </CardHeader>
          <CardContent>
            {purchasePieData.length > 0 ? (
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
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Vendas</CardTitle>
            <CardDescription>Top 8 materiais mais vendidos ({getPeriodLabel()})</CardDescription>
          </CardHeader>
          <CardContent>
            {salesPieData.length > 0 ? (
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
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimentação Mensal</CardTitle>
          <CardDescription>Histórico geral (não afetado pelo filtro)</CardDescription>
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
          <CardDescription>Top 5 materiais mais lucrativos ({getPeriodLabel()})</CardDescription>
        </CardHeader>
        <CardContent>
          {materialData.length > 0 ? (
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
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Sem dados para o período selecionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
