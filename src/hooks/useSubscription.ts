import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionData {
  subscribed: boolean;
  plan_type: 'free' | 'pro';
  subscription_end?: string;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData>({
    subscribed: false,
    plan_type: 'free'
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscription({ subscribed: false, plan_type: 'free' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setSubscription(data);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o status da assinatura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    
    // Check every 60 seconds
    const interval = setInterval(checkSubscription, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return { 
    subscription, 
    loading, 
    refreshSubscription: checkSubscription,
    isPro: subscription.plan_type === 'pro'
  };
};
