-- Corrige o cálculo do valor total em estoque
-- O total_stock_value deve ser: estoque atual × preço médio de compra
CREATE OR REPLACE FUNCTION public.get_user_stock()
RETURNS TABLE(
  material_id uuid,
  material_name text,
  unit text,
  current_stock numeric,
  avg_purchase_price numeric,
  total_stock_value numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH buy_summary AS (
    SELECT 
      material_id,
      SUM(quantity) as total_quantity_bought,
      SUM(quantity * price_per_unit) as total_cost_bought
    FROM public.transactions
    WHERE type = 'BUY' AND user_id = auth.uid()
    GROUP BY material_id
  )
  SELECT 
    m.id as material_id,
    m.name as material_name,
    m.unit_of_measure as unit,
    COALESCE(s.quantity, 0) as current_stock,
    COALESCE(buy.total_cost_bought / NULLIF(buy.total_quantity_bought, 0), 0) as avg_purchase_price,
    COALESCE(s.quantity, 0) * COALESCE(buy.total_cost_bought / NULLIF(buy.total_quantity_bought, 0), 0) as total_stock_value
  FROM public.materials m
  LEFT JOIN public.stock s ON m.id = s.material_id
  LEFT JOIN buy_summary buy ON m.id = buy.material_id
  WHERE m.user_id = auth.uid();
$$;