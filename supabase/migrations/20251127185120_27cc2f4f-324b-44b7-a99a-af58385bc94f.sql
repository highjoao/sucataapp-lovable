-- Update get_user_stock function to use FIFO-based pricing instead of average
CREATE OR REPLACE FUNCTION public.get_user_stock()
RETURNS TABLE(
  material_id uuid,
  material_name text,
  unit text,
  current_stock numeric,
  avg_purchase_price numeric,
  total_stock_value numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH purchase_summary AS (
    SELECT 
      p.material_id,
      SUM(p.quantity) as total_quantity_bought,
      SUM(p.total_price) as total_cost
    FROM public.purchases p
    WHERE p.user_id = auth.uid()
    GROUP BY p.material_id
  )
  SELECT 
    m.id as material_id,
    m.name as material_name,
    m.unit_of_measure as unit,
    COALESCE(s.quantity, 0) as current_stock,
    CASE 
      WHEN ps.total_quantity_bought > 0 
      THEN ps.total_cost / ps.total_quantity_bought
      ELSE 0
    END as avg_purchase_price,
    COALESCE(s.quantity, 0) * CASE 
      WHEN ps.total_quantity_bought > 0 
      THEN ps.total_cost / ps.total_quantity_bought
      ELSE 0
    END as total_stock_value
  FROM public.materials m
  LEFT JOIN public.stock s ON m.id = s.material_id
  LEFT JOIN purchase_summary ps ON m.id = ps.material_id
  WHERE m.user_id = auth.uid();
END;
$function$;