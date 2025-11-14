-- Corrigir a função get_user_stock para usar a tabela stock e transactions corretas
CREATE OR REPLACE FUNCTION public.get_user_stock()
RETURNS TABLE(material_id uuid, material_name text, unit text, current_stock numeric, avg_purchase_price numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    m.id as material_id,
    m.name as material_name,
    m.unit_of_measure as unit,
    COALESCE(s.quantity, 0) as current_stock,
    COALESCE(
      (SELECT AVG(t.price_per_unit) 
       FROM public.transactions t 
       WHERE t.material_id = m.id 
       AND t.type = 'BUY' 
       AND t.user_id = auth.uid()), 
      0
    ) as avg_purchase_price
  FROM public.materials m
  LEFT JOIN public.stock s ON m.id = s.material_id
  WHERE m.user_id = auth.uid();
$$;