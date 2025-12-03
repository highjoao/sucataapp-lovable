CREATE OR REPLACE FUNCTION get_user_stock()
RETURNS TABLE (
  material_id UUID,
  material_name TEXT,
  unit TEXT,
  current_stock NUMERIC,
  avg_purchase_price NUMERIC,
  total_stock_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as material_id,
    m.name as material_name,
    m.unit_of_measure as unit,
    COALESCE(s.quantity, 0) as current_stock,
    CASE
      WHEN COALESCE(s.quantity, 0) > 0 THEN COALESCE(s.total_value, 0) / s.quantity
      ELSE 0
    END as avg_purchase_price,
    COALESCE(s.total_value, 0) as total_stock_value
  FROM materials m
  LEFT JOIN stock s ON m.id = s.material_id AND s.user_id = auth.uid()
  WHERE m.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;
