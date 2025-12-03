-- ============================================
-- CLEANUP DUPLICATES
-- ============================================

-- 1. Ensure legacy triggers are gone (Safety first)
DROP TRIGGER IF EXISTS on_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS on_transaction_insert_update_stock ON transactions;
DROP TRIGGER IF EXISTS update_stock_on_transaction ON transactions;
DROP TRIGGER IF EXISTS handle_stock_update ON transactions;

-- 2. Delete recent duplicates from 'transactions' table
DELETE FROM transactions 
WHERE created_at > (NOW() - INTERVAL '1 day');

-- 3. Recalculate Stock from Purchases and Sales (Source of Truth)
DO $$
DECLARE
    r RECORD;
    total_qty NUMERIC;
    total_val NUMERIC;
    buy_qty NUMERIC;
    buy_val NUMERIC;
    sell_qty NUMERIC;
    sell_cost NUMERIC;
BEGIN
    FOR r IN 
        SELECT DISTINCT material_id, user_id FROM purchases
        UNION
        SELECT DISTINCT material_id, user_id FROM sales
    LOOP
        SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(total_price), 0)
        INTO buy_qty, buy_val
        FROM purchases
        WHERE material_id = r.material_id AND user_id = r.user_id;

        SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(cost_price), 0)
        INTO sell_qty, sell_cost
        FROM sales
        WHERE material_id = r.material_id AND user_id = r.user_id;

        total_qty := buy_qty - sell_qty;
        total_val := buy_val - sell_cost;

        INSERT INTO stock (user_id, material_id, quantity, total_value, updated_at)
        VALUES (r.user_id, r.material_id, total_qty, total_val, NOW())
        ON CONFLICT (material_id) 
        DO UPDATE SET 
            quantity = EXCLUDED.quantity,
            total_value = EXCLUDED.total_value,
            updated_at = NOW();
    END LOOP;
END $$;

-- ============================================
-- ADMIN PANEL SETUP
-- ============================================

-- 1. Add columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 2. Create access_logs table
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- 3. Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. RLS Policies
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all access_logs"
ON public.access_logs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own logs"
ON public.access_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Set specific user as admin
UPDATE public.profiles SET role = 'admin' WHERE id = 'da086be3-024e-4492-80ef-a7acc17bcd8e';