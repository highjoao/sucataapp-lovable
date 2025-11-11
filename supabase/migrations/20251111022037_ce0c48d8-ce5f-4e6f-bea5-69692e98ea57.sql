-- Remove Pro plan restrictions from RLS policies
-- Update materials table policies
DROP POLICY IF EXISTS "Pro users can manage their own materials" ON public.materials;
CREATE POLICY "Users can manage their own materials" ON public.materials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update purchases table policies
DROP POLICY IF EXISTS "Pro users can manage their own purchases" ON public.purchases;
CREATE POLICY "Users can manage their own purchases" ON public.purchases
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update sales table policies
DROP POLICY IF EXISTS "Pro users can manage their own sales" ON public.sales;
CREATE POLICY "Users can manage their own sales" ON public.sales
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);