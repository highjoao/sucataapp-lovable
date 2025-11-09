import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuoteData {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const Quotes = () => {
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Dados simulados - Em produção, você pode integrar com uma API real como MetalsAPI.com
    const fetchQuotes = async () => {
      try {
        // Simulando dados de cotação
        const mockData: QuoteData[] = [
          { name: "Dólar Americano", symbol: "USD", price: 5.12, change: 0.03, changePercent: 0.59 },
          { name: "Euro", symbol: "EUR", price: 5.45, change: -0.02, changePercent: -0.37 },
          { name: "Cobre", symbol: "CU", price: 38.50, change: 0.85, changePercent: 2.26 },
          { name: "Alumínio", symbol: "AL", price: 12.30, change: -0.15, changePercent: -1.20 },
          { name: "Bronze", symbol: "BR", price: 28.75, change: 0.42, changePercent: 1.48 },
          { name: "Ouro", symbol: "AU", price: 345.20, change: 2.10, changePercent: 0.61 },
        ];

        // Simula um delay de rede
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setQuotes(mockData);
        setIsLoading(false);
      } catch (error) {
        toast({
          title: "Erro ao buscar cotações",
          description: "Não foi possível carregar as cotações atuais.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    fetchQuotes();
    
    // Atualiza a cada 5 minutos
    const interval = setInterval(fetchQuotes, 300000);
    return () => clearInterval(interval);
  }, [toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cotações</h1>
          <p className="text-muted-foreground">Acompanhe as cotações em tempo real</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-32 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cotações</h1>
        <p className="text-muted-foreground">
          Acompanhe as cotações em tempo real de moedas e metais
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <p>
          <strong>Nota:</strong> As cotações são atualizadas automaticamente. Valores em R$ por kg
          para metais e cotação para moedas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quotes.map((quote) => {
          const isPositive = quote.change >= 0;
          const Icon = isPositive ? TrendingUp : TrendingDown;

          return (
            <Card key={quote.symbol} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      {quote.name}
                    </CardTitle>
                    <CardDescription className="mt-1">{quote.symbol}</CardDescription>
                  </div>
                  <Badge variant={isPositive ? "default" : "destructive"} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {quote.changePercent.toFixed(2)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-3xl font-bold">R$ {quote.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Icon
                      className={`h-4 w-4 ${
                        isPositive ? "text-success" : "text-destructive"
                      }`}
                    />
                    <span
                      className={isPositive ? "text-success" : "text-destructive"}
                    >
                      {isPositive ? "+" : ""}
                      {quote.change.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">hoje</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sobre as Cotações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Moedas (USD, EUR):</strong> Cotação da moeda em relação ao Real brasileiro
          </p>
          <p>
            • <strong>Metais (Cobre, Alumínio, Bronze, Ouro):</strong> Preço médio por kg em R$
          </p>
          <p>
            • As cotações são atualizadas automaticamente a cada 5 minutos
          </p>
          <p className="text-xs">
            Nota: Para cotações precisas em tempo real, considere integrar uma API especializada
            como MetalsAPI, CurrencyAPI ou similar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Quotes;
