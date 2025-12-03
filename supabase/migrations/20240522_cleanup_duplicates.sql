-- 1. Ensure legacy triggers are gone (Safety first)
DROP TRIGGER IF EXISTS on_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS on_transaction_insert_update_stock ON transactions;
DROP TRIGGER IF EXISTS update_stock_on_transaction ON transactions;
DROP TRIGGER IF EXISTS handle_stock_update ON transactions;

-- 2. Delete recent duplicates from 'transactions' table
-- We assume that any record in 'transactions' created in the last 24 hours is a duplicate
-- because the new logic writes to 'purchases' and 'sales', and we don't want double records.
-- Legacy data (older than 24h) is kept.
DELETE FROM transactions 
WHERE created_at > (NOW() - INTERVAL '1 day');

-- 3. Recalculate Stock from Purchases and Sales (Source of Truth)
-- This ensures that if the stock was double-counted, it gets corrected.
DO $$
DECLARE
    r RECORD;
    total_qty NUMERIC;
    total_val NUMERIC;
    buy_qty NUMERIC;
    buy_val NUMERIC;
    sell_qty NUMERIC;
    sell_val NUMERIC;
    sell_cost NUMERIC;
BEGIN
    -- Iterate over all materials that have ever been bought or sold
    FOR r IN 
        SELECT DISTINCT material_id, user_id FROM purchases
        UNION
        SELECT DISTINCT material_id, user_id FROM sales
    LOOP
        -- Calculate Total Purchases
        SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(total_price), 0)
        INTO buy_qty, buy_val
        FROM purchases
        WHERE material_id = r.material_id AND user_id = r.user_id;

        -- Calculate Total Sales
        SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(cost_price), 0)
        INTO sell_qty, sell_cost
        FROM sales
        WHERE material_id = r.material_id AND user_id = r.user_id;

        -- Current Stock
        total_qty := buy_qty - sell_qty;
        
        -- Current Value (Accumulative)
        -- Value = Total Purchase Value - Cost of Goods Sold
        total_val := buy_val - sell_cost;

        -- Update Stock Table
        -- We use ON CONFLICT to insert if missing (though it should exist)
        INSERT INTO stock (user_id, material_id, quantity, total_value, updated_at)
        VALUES (r.user_id, r.material_id, total_qty, total_val, NOW())
        ON CONFLICT (material_id) 
        DO UPDATE SET 
            quantity = EXCLUDED.quantity,
            total_value = EXCLUDED.total_value,
            updated_at = NOW();
            
    END LOOP;
END $$;
