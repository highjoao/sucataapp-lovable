import { format } from "date-fns";
import { AlertCircle, PackageX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  type: 'BUY' | 'SELL';
  material_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  date: string;
};

export const RecentTransactions = () => {
  // Buscar compras e vendas e unificar em uma lista
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar compras
      const { data: purchases, error: purchasesError } = await supabase
        .from("purchases")
        .select(`
          id,
          quantity,
          unit_price,
          purchase_date,
          materials (name, unit_of_measure)
        `)
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false })
        .limit(5);

      if (purchasesError) throw purchasesError;

      // Buscar vendas
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          quantity,
          unit_price,
          sale_date,
          materials (name, unit_of_measure)
        `)
        .eq("user_id", user.id)
        .order("sale_date", { ascending: false })
        .limit(5);

      if (salesError) throw salesError;

      // Unificar e mapear para formato comum
      const allTransactions: Transaction[] = [
        ...(purchases || []).map((p: any) => ({
          id: p.id,
          type: 'BUY' as const,
          material_name: p.materials?.name || '',
          unit: p.materials?.unit_of_measure || '',
          quantity: Number(p.quantity),
          unit_price: Number(p.unit_price),
          date: p.purchase_date,
        })),
        ...(sales || []).map((s: any) => ({
          id: s.id,
          type: 'SELL' as const,
          material_name: s.materials?.name || '',
          unit: s.materials?.unit_of_measure || '',
          quantity: Number(s.quantity),
          unit_price: Number(s.unit_price),
          date: s.sale_date,
        })),
      ];

      // Ordenar por data (mais recente primeiro) e pegar apenas 5
      return allTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
        <CardDescription>As últimas 5 compras e vendas realizadas</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Estado de carregamento */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Estado de erro */}
        {error && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar transações: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Estado vazio */}
        {!isLoading && !error && transactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PackageX className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma transação recente encontrada. Comece registrando suas primeiras compras ou vendas!
            </p>
          </div>
        )}

        {/* Renderização da lista */}
        {!isLoading && !error && transactions.length > 0 && (
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const totalValue = transaction.quantity * transaction.unit_price;
              const formattedValue = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(totalValue);

              const formattedDate = format(
                new Date(transaction.date),
                'dd/MM/yyyy'
              );

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          transaction.type === 'BUY'
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        )}
                      >
                        {transaction.type === 'BUY' ? 'COMPRA' : 'VENDA'}
                      </Badge>
                      <span className="text-base font-semibold">
                        {transaction.material_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {transaction.quantity.toFixed(2)} {transaction.unit}
                      </span>
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formattedValue}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
