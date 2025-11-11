-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own subscription (for Stripe webhooks)
CREATE POLICY "Users can update their own subscription"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Automatically create free subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- Add updated_at trigger
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Security definer function to check if user has pro plan
CREATE OR REPLACE FUNCTION public.has_pro_plan(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND plan_type = 'pro'
      AND status = 'active'
  )
$$;

-- Update RLS policies for existing tables to check plan
-- Purchases: only pro users
DROP POLICY IF EXISTS "Users can manage their own purchases" ON public.purchases;
CREATE POLICY "Pro users can manage their own purchases"
  ON public.purchases
  FOR ALL
  USING (auth.uid() = user_id AND public.has_pro_plan(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_pro_plan(auth.uid()));

-- Sales: only pro users
DROP POLICY IF EXISTS "Users can manage their own sales" ON public.sales;
CREATE POLICY "Pro users can manage their own sales"
  ON public.sales
  FOR ALL
  USING (auth.uid() = user_id AND public.has_pro_plan(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_pro_plan(auth.uid()));

-- Materials: only pro users
DROP POLICY IF EXISTS "Users can manage their own materials" ON public.materials;
CREATE POLICY "Pro users can manage their own materials"
  ON public.materials
  FOR ALL
  USING (auth.uid() = user_id AND public.has_pro_plan(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_pro_plan(auth.uid()));