-- Drop the insecure stock_view
DROP VIEW IF EXISTS public.stock_view;

-- Create a secure function that filters stock data by authenticated user
CREATE OR REPLACE FUNCTION public.get_user_stock()
RETURNS TABLE (
  material_id uuid,
  material_name text,
  unit text,
  current_stock numeric,
  avg_purchase_price numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id as material_id,
    m.name as material_name,
    m.unit,
    COALESCE(SUM(p.quantity), 0) - COALESCE(SUM(s.quantity), 0) as current_stock,
    COALESCE(AVG(p.unit_price), 0) as avg_purchase_price
  FROM public.materials m
  LEFT JOIN public.purchases p ON m.id = p.material_id
  LEFT JOIN public.sales s ON m.id = s.material_id
  WHERE m.user_id = auth.uid()
  GROUP BY m.id, m.name, m.unit;
$$;