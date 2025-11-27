import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Entradas e saídas ao longo do tempo</p>
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
