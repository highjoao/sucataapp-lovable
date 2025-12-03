CREATE OR REPLACE FUNCTION reset_user_data()
RETURNS VOID AS $$
BEGIN
  -- Delete all sales for the user
  DELETE FROM sales WHERE user_id = auth.uid();
  
  -- Delete all purchases for the user
  DELETE FROM purchases WHERE user_id = auth.uid();
  
  -- Delete all legacy transactions for the user
  DELETE FROM transactions WHERE user_id = auth.uid();
  
  -- Delete all stock entries for the user
  DELETE FROM stock WHERE user_id = auth.uid();
  
  -- Note: Materials and Suppliers are kept as they are configuration data, not transactional.
  -- If the user wants to delete those too, we can add them, but usually "reset account" implies resetting progress/transactions.
  -- Based on the request "vendas compras e estoque", we stick to these.
END;
$$ LANGUAGE plpgsql;
