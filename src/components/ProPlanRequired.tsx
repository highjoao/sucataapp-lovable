import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

export const ProPlanRequired = ({ children }: { children: React.ReactNode }) => {
  const { isPro, loading } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  if (!isPro) {
    return (
      <div className="space-y-6">
        <Alert className="border-primary bg-primary/5">
          <Lock className="h-5 w-5" />
          <AlertTitle className="text-lg">Plano Pro Necessário</AlertTitle>
          <AlertDescription className="mt-2">
            Este recurso está disponível apenas para usuários do Plano Pro.
            Faça upgrade agora por apenas R$ 1,00/mês e tenha acesso completo a todas as funcionalidades.
          </AlertDescription>
          <div className="mt-4">
            <Button onClick={() => navigate('/plans')}>
              <Crown className="mr-2 h-4 w-4" />
              Upgrade para Pro
            </Button>
          </div>
        </Alert>
        
        <div className="opacity-50 pointer-events-none blur-sm">
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
