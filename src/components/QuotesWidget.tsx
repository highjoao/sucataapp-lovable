import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Quote {
  name: string;
  symbol: string;
  price: number;
  variation: number;
  lastUpdate: string;
}

const CACHE_KEY = "sucataapp_quotes_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em ms

export const QuotesWidget = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  const getCachedQuotes = (): { quotes: Quote[]; timestamp: number } | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // Verifica se o cache ainda é válido (menos de 24h)
      if (now - data.timestamp < CACHE_DURATION) {
        return data;
      }
      
      // Cache expirado, remove
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error("Erro ao ler cache:", error);
      return null;
    }
  };

  const setCachedQuotes = (quotesData: Quote[]) => {
    try {
      const cacheData = {
        quotes: quotesData,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Erro ao salvar cache:", error);
    }
  };

  const fetchQuotes = async (forceRefresh = false) => {
    // Verifica cache primeiro
    if (!forceRefresh) {
      const cached = getCachedQuotes();
      if (cached) {
        setQuotes(cached.quotes);
        setLastUpdate(new Date(cached.timestamp));
        return;
      }
    }

    setIsLoading(true);
    
    try {
      // API AwesomeAPI para Dólar
      const usdResponse = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
      const usdData = await usdResponse.json();
      
      // Simular dados de commodities (Alumínio e Cobre)
      // Em produção, usar APIs reais como Metal Prices API ou similar
      const quotesData: Quote[] = [
        {
          name: "Dólar",
          symbol: "USD/BRL",
          price: parseFloat(usdData.USDBRL.bid),
          variation: parseFloat(usdData.USDBRL.pctChange),
          lastUpdate: new Date(parseInt(usdData.USDBRL.timestamp) * 1000).toLocaleDateString("pt-BR"),
        },
        {
          name: "Alumínio",
          symbol: "AL",
          price: 2.45, // R$/kg - Exemplo simulado
          variation: 1.2,
          lastUpdate: new Date().toLocaleDateString("pt-BR"),
        },
        {
          name: "Cobre",
          symbol: "CU",
          price: 8.75, // R$/kg - Exemplo simulado
          variation: -0.8,
          lastUpdate: new Date().toLocaleDateString("pt-BR"),
        },
      ];

      setQuotes(quotesData);
      setLastUpdate(new Date());
      setCachedQuotes(quotesData);
      
      if (forceRefresh) {
        toast({
          title: "Cotações atualizadas!",
          description: "As cotações foram atualizadas com sucesso.",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar cotações:", error);
      toast({
        title: "Erro ao buscar cotações",
        description: "Não foi possível atualizar as cotações. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cotações</CardTitle>
          <CardDescription>
            {lastUpdate ? `Última atualização: ${lastUpdate.toLocaleString("pt-BR")}` : "Carregando..."}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchQuotes(true)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && quotes.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">Carregando cotações...</p>
        ) : (
          <div className="space-y-3">
            {quotes.map((quote) => (
              <div
                key={quote.symbol}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{quote.name}</p>
                    <p className="text-xs text-muted-foreground">{quote.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    R$ {quote.price.toFixed(2)}
                  </p>
                  <Badge
                    variant={quote.variation >= 0 ? "default" : "destructive"}
                    className="gap-1"
                  >
                    {quote.variation >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(quote.variation).toFixed(2)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3 text-center">
          * Alumínio e Cobre são valores simulados para demonstração
        </p>
      </CardContent>
    </Card>
  );
};
