-- Drop existing triggers to clean up
DROP TRIGGER IF EXISTS on_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS on_transaction_insert_update_stock ON transactions;
DROP TRIGGER IF EXISTS update_stock_on_transaction ON transactions;
DROP TRIGGER IF EXISTS handle_stock_update ON transactions;

DROP TRIGGER IF EXISTS on_purchase_stock_update ON purchases;
DROP TRIGGER IF EXISTS on_sale_stock_update ON sales;

-- Drop the old function
DROP FUNCTION IF EXISTS handle_transaction_stock_update;

-- 1. Function to calculate cost and profit BEFORE insertion/update on SALES
CREATE OR REPLACE FUNCTION calculate_sale_data()
RETURNS TRIGGER AS $$
DECLARE
    current_stock_qty NUMERIC;
    current_stock_value NUMERIC;
    cost_proportional NUMERIC;
    virtual_stock_qty NUMERIC;
    virtual_stock_value NUMERIC;
BEGIN
    -- Get current stock
    SELECT quantity, total_value INTO current_stock_qty, current_stock_value
    FROM stock
    WHERE material_id = NEW.material_id AND user_id = NEW.user_id;

    IF NOT FOUND THEN
        current_stock_qty := 0;
        current_stock_value := 0;
    END IF;

    -- Calculate Virtual Stock (Stock state before this transaction)
    IF (TG_OP = 'UPDATE') THEN
        -- Revert OLD transaction to get available stock
        virtual_stock_qty := current_stock_qty + OLD.quantity;
        virtual_stock_value := current_stock_value + OLD.cost_price;
    ELSE
        -- INSERT
        virtual_stock_qty := current_stock_qty;
        virtual_stock_value := current_stock_value;
    END IF;

    -- Check Sufficiency
    IF (virtual_stock_qty < NEW.quantity) THEN
        RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', virtual_stock_qty, NEW.quantity;
    END IF;

    -- Calculate Cost Price (Weighted Average)
    IF (virtual_stock_qty > 0) THEN
        cost_proportional := (virtual_stock_value / virtual_stock_qty) * NEW.quantity;
    ELSE
        cost_proportional := 0;
    END IF;

    -- Set calculated values
    NEW.cost_price := cost_proportional;
    NEW.profit := NEW.total_price - cost_proportional;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to update STOCK table AFTER transaction
CREATE OR REPLACE FUNCTION update_stock_final()
RETURNS TRIGGER AS $$
DECLARE
    item_material_id UUID;
    item_user_id UUID;
    diff_qty NUMERIC;
    diff_val NUMERIC;
BEGIN
    -- Determine IDs
    IF (TG_OP = 'DELETE') THEN
        item_material_id := OLD.material_id;
        item_user_id := OLD.user_id;
    ELSE
        item_material_id := NEW.material_id;
        item_user_id := NEW.user_id;
    END IF;

    -- Ensure stock record exists (for Purchases)
    IF (TG_TABLE_NAME = 'purchases' AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE')) THEN
        INSERT INTO stock (user_id, material_id, quantity, total_value)
        VALUES (item_user_id, item_material_id, 0, 0)
        ON CONFLICT (material_id) DO NOTHING;
    END IF;

    -- Calculate Differences
    IF (TG_TABLE_NAME = 'purchases') THEN
        IF (TG_OP = 'INSERT') THEN
            diff_qty := NEW.quantity;
            diff_val := NEW.total_price;
        ELSIF (TG_OP = 'DELETE') THEN
            diff_qty := -OLD.quantity;
            diff_val := -OLD.total_price;
        ELSIF (TG_OP = 'UPDATE') THEN
            diff_qty := NEW.quantity - OLD.quantity;
            diff_val := NEW.total_price - OLD.total_price;
        END IF;
    
    ELSIF (TG_TABLE_NAME = 'sales') THEN
        -- Note: For sales, increasing quantity DECREASES stock
        IF (TG_OP = 'INSERT') THEN
            diff_qty := -NEW.quantity;
            diff_val := -NEW.cost_price; -- cost_price is already calculated by BEFORE trigger
        ELSIF (TG_OP = 'DELETE') THEN
            diff_qty := OLD.quantity;
            diff_val := OLD.cost_price;
        ELSIF (TG_OP = 'UPDATE') THEN
            diff_qty := -(NEW.quantity - OLD.quantity);
            diff_val := -(NEW.cost_price - OLD.cost_price);
        END IF;
    END IF;

    -- Apply Update
    UPDATE stock
    SET 
        quantity = quantity + diff_qty,
        total_value = total_value + diff_val,
        updated_at = NOW()
    WHERE material_id = item_material_id AND user_id = item_user_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Triggers

-- Sales: BEFORE (Calc) and AFTER (Update Stock)
CREATE TRIGGER before_sale_calc
BEFORE INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION calculate_sale_data();

CREATE TRIGGER after_sale_stock
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION update_stock_final();

-- Purchases: AFTER (Update Stock)
CREATE TRIGGER after_purchase_stock
AFTER INSERT OR UPDATE OR DELETE ON purchases
FOR EACH ROW EXECUTE FUNCTION update_stock_final();
