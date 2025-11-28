import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, Sun, Moon, Sunrise } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashFlowData {
  date: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

const CashFlow = () => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const [saldoFinal, setSaldoFinal] = useState(0);

  // New State for Greeting and Daily Stats
  const [userName, setUserName] = useState<string>("");
  const [dailyStats, setDailyStats] = useState({
    sales: 0,
    purchases: 0,
    profit: 0
  });

  // Fetch User and Daily Stats
  useEffect(() => {
    const fetchUserDataAndDailyStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get User Name
      // Try to get from metadata or use email part
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "Usuário";
      setUserName(name);

      // Get Daily Stats
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const { data: dailySales } = await supabase
        .from("sales")
        .select("total_price, profit")
        .eq("user_id", user.id)
        .gte("sale_date", todayStart.toISOString())
        .lte("sale_date", todayEnd.toISOString());

      const { data: dailyPurchases } = await supabase
        .from("purchases")
        .select("total_price")
        .eq("user_id", user.id)
        .gte("purchase_date", todayStart.toISOString())
        .lte("purchase_date", todayEnd.toISOString());

      const todaySales = dailySales?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
      const todayProfit = dailySales?.reduce((sum, s) => sum + Number(s.profit), 0) || 0;
      const todayPurchases = dailyPurchases?.reduce((sum, p) => sum + Number(p.total_price), 0) || 0;

      setDailyStats({
        sales: todaySales,
        purchases: todayPurchases,
        profit: todayProfit
      });
    };

    fetchUserDataAndDailyStats();
  }, []);

  useEffect(() => {
    const fetchCashFlow = async () => {
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
          start = startOfWeek(now, { weekStartsOn: 0 });
          end = endOfWeek(now, { weekStartsOn: 0 });
          break;
        case "month":
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
      }

      // Get sales (entradas)
      const { data: sales } = await supabase
        .from("sales")
        .select("sale_date, total_price")
        .eq("user_id", user.id)
        .gte("sale_date", start.toISOString())
        .lte("sale_date", end.toISOString())
        .order("sale_date");

      // Get purchases (saídas)
      const { data: purchases } = await supabase
        .from("purchases")
        .select("purchase_date, total_price")
        .eq("user_id", user.id)
        .gte("purchase_date", start.toISOString())
        .lte("purchase_date", end.toISOString())
        .order("purchase_date");

      // Group by date
      const dataMap = new Map<string, { entradas: number; saidas: number }>();

      sales?.forEach(s => {
        const dateKey = format(new Date(s.sale_date), "dd/MM/yyyy", { locale: ptBR });
        if (!dataMap.has(dateKey)) {
          dataMap.set(dateKey, { entradas: 0, saidas: 0 });
        }
        const data = dataMap.get(dateKey)!;
        data.entradas += Number(s.total_price);
      });

      purchases?.forEach(p => {
        const dateKey = format(new Date(p.purchase_date), "dd/MM/yyyy", { locale: ptBR });
        if (!dataMap.has(dateKey)) {
          dataMap.set(dateKey, { entradas: 0, saidas: 0 });
        }
        const data = dataMap.get(dateKey)!;
        data.saidas += Number(p.total_price);
      });

      // Convert to array and calculate cumulative balance
      let saldoAcumulado = 0;
      const flowData: CashFlowData[] = Array.from(dataMap.entries())
        .sort((a, b) => {
          const dateA = a[0].split('/').reverse().join('');
          const dateB = b[0].split('/').reverse().join('');
          return dateA.localeCompare(dateB);
        })
        .map(([date, values]) => {
          saldoAcumulado += values.entradas - values.saidas;
          return {
            date,
            entradas: values.entradas,
            saidas: values.saidas,
            saldo: saldoAcumulado,
          };
        });

      setCashFlowData(flowData);

      // Calculate totals
      const totalEntradas = flowData.reduce((sum, d) => sum + d.entradas, 0);
      const totalSaidas = flowData.reduce((sum, d) => sum + d.saidas, 0);

      setTotalEntradas(totalEntradas);
      setTotalSaidas(totalSaidas);
      setSaldoFinal(totalEntradas - totalSaidas);
    };

    fetchCashFlow();
  }, [dateRange, toast]);

  const getPeriodLabel = () => {
    switch (dateRange) {
      case "today": return "Hoje";
      case "week": return "Esta Semana";
      case "month": return "Este Mês";
      default: return "";
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { text: "Bom dia", icon: Sunrise, color: "text-yellow-500" };
    } else if (hour >= 12 && hour < 18) {
      return { text: "Boa tarde", icon: Sun, color: "text-orange-500" };
    } else {
      return { text: "Boa noite", icon: Moon, color: "text-indigo-500" };
    }
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  return (
    <div className="space-y-8">
      {/* Greeting Section */}
      <div className="flex items-center gap-3 bg-card p-6 rounded-lg border shadow-sm">
        <div className={`p-3 rounded-full bg-background border ${greeting.color}`}>
          <GreetingIcon className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {greeting.text}, {userName}!
          </h1>
          <p className="text-muted-foreground">
            Aqui está o resumo das suas atividades de hoje.
          </p>
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dailyStats.sales)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-transparent dark:from-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compras de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(dailyStats.purchases)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dailyStats.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(dailyStats.profit)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Fluxo de Caixa Detalhado</h2>
          <p className="text-muted-foreground">Análise de entradas e saídas por período</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas ({getPeriodLabel()})</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEntradas)}</div>
            <p className="text-xs text-muted-foreground">Vendas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Saídas ({getPeriodLabel()})</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalSaidas)}</div>
            <p className="text-xs text-muted-foreground">Compras realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo ({getPeriodLabel()})</CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldoFinal)}
            </div>
            <p className="text-xs text-muted-foreground">Entradas - Saídas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Saldo</CardTitle>
            <CardDescription>Saldo acumulado ao longo do período</CardDescription>
          </CardHeader>
          <CardContent>
            {cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Saldo"
                  />
                </LineChart>
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
            <CardTitle>Entradas vs Saídas</CardTitle>
            <CardDescription>Comparativo diário de entradas e saídas</CardDescription>
          </CardHeader>
          <CardContent>
            {cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: 'hsl(var(--foreground))' }}
                    tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="entradas" fill="#10b981" name="Entradas" />
                  <Bar dataKey="saidas" fill="#ef4444" name="Saídas" />
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

      {cashFlowData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Diário</CardTitle>
            <CardDescription>Movimentações detalhadas por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cashFlowData.map((item, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2">
                  <div className="font-medium">{item.date}</div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">+{formatCurrency(item.entradas)}</span>
                    <span className="text-red-600">-{formatCurrency(item.saidas)}</span>
                    <span className={`font-bold ${item.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      = {formatCurrency(item.saldo)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CashFlow;
