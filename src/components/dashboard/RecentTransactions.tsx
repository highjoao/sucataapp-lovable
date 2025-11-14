import { format } from "date-fns";
import { AlertCircle, PackageX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/hooks/useTransactions";
import { cn } from "@/lib/utils";

export const RecentTransactions = () => {
  const { transactions, isLoading, error } = useTransactions();

  // Pegar apenas as 5 transações mais recentes
  const recentTransactions = transactions.slice(0, 5);

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
        {!isLoading && !error && recentTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <PackageX className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma transação recente encontrada. Comece registrando suas primeiras compras ou vendas!
            </p>
          </div>
        )}

        {/* Renderização da lista */}
        {!isLoading && !error && recentTransactions.length > 0 && (
          <div className="space-y-4">
            {recentTransactions.map((transaction) => {
              const totalValue = Number(transaction.quantity) * Number(transaction.price_per_unit);
              const formattedValue = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(totalValue);

              const formattedDate = format(
                new Date(transaction.transaction_date),
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
                        {transaction.materials?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {Number(transaction.quantity).toFixed(2)}{' '}
                        {transaction.materials?.unit_of_measure}
                      </span>
                      <span>{formattedDate}</span>
                      {transaction.suppliers && (
                        <span className="text-xs">
                          Fornecedor: {transaction.suppliers.name}
                        </span>
                      )}
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
