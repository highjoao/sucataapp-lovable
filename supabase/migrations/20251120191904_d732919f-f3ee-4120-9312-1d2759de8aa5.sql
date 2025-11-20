-- Recria a função get_user_stock com cálculo correto do valor total em estoque
-- O total_stock_value agora reflete o custo total de aquisição (soma das compras - soma das vendas)
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
  ),
  sell_summary AS (
    SELECT 
      material_id,
      SUM(quantity * price_per_unit) as total_cost_sold
    FROM public.transactions
    WHERE type = 'SELL' AND user_id = auth.uid()
    GROUP BY material_id
  )
  SELECT 
    m.id as material_id,
    m.name as material_name,
    m.unit_of_measure as unit,
    COALESCE(s.quantity, 0) as current_stock,
    COALESCE(buy.total_cost_bought / NULLIF(buy.total_quantity_bought, 0), 0) as avg_purchase_price,
    COALESCE(buy.total_cost_bought, 0) - COALESCE(sell.total_cost_sold, 0) as total_stock_value
  FROM public.materials m
  LEFT JOIN public.stock s ON m.id = s.material_id
  LEFT JOIN buy_summary buy ON m.id = buy.material_id
  LEFT JOIN sell_summary sell ON m.id = sell.material_id
  WHERE m.user_id = auth.uid();
$$;