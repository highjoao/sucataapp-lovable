import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

const Plans = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { subscription, isPro } = useSubscription();

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Faça login",
          description: "Você precisa estar logado para assinar",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      console.log('Iniciando checkout...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Resposta do checkout:', { data, error });

      if (error) {
        console.error('Erro na invocação:', error);
        throw error;
      }

      if (!data?.url) {
        throw new Error('URL do checkout não foi retornada');
      }

      // Redirecionar na mesma aba
      window.location.href = data.url;
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível iniciar o checkout",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const freePlanFeatures = [
    "Visualizar cotações de materiais",
    "Dashboard básico",
    "Consultar preços em tempo real"
  ];

  const proPlanFeatures = [
    "Tudo do plano gratuito",
    "Gerenciar compras de materiais",
    "Registrar vendas",
    "Controle de estoque completo",
    "Gráficos de lucro e movimentação",
    "Histórico de transações",
    "Adicionar fornecedores"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Escolha seu Plano</h1>
          <p className="text-muted-foreground text-lg">
            Comece grátis ou desbloqueie todos os recursos por apenas R$ 1,00/mês
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className={subscription.plan_type === 'free' ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="text-2xl">Plano Gratuito</CardTitle>
              <CardDescription>
                Perfeito para começar
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freePlanFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {subscription.plan_type === 'free' ? (
                <Button variant="outline" className="w-full" disabled>
                  Plano Atual
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Downgrade Indisponível
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className={isPro ? "border-primary relative" : "border-2 border-primary relative"}>
            {!isPro && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  Recomendado
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                Plano Pro
                <Sparkles className="h-5 w-5 text-primary" />
              </CardTitle>
              <CardDescription>
                Acesso completo a todas as funcionalidades
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ 1</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proPlanFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span className="font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isPro ? (
                <Button variant="outline" className="w-full" disabled>
                  <Check className="mr-2 h-4 w-4" />
                  Plano Ativo
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading ? "Carregando..." : "Assinar Agora"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Plans;
