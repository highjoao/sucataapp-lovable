-- Add total_value column to stock table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'total_value') THEN
        ALTER TABLE stock ADD COLUMN total_value NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION handle_transaction_stock_update()
RETURNS TRIGGER AS $$
DECLARE
    current_stock_qty NUMERIC;
    current_stock_value NUMERIC;
    new_stock_qty NUMERIC;
    new_stock_value NUMERIC;
    cost_proportional NUMERIC;
    item_material_id UUID;
    item_user_id UUID;
BEGIN
    -- Determine operation type and set variables
    IF (TG_OP = 'INSERT') THEN
        item_material_id := NEW.material_id;
        item_user_id := NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        item_material_id := OLD.material_id;
        item_user_id := OLD.user_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        item_material_id := NEW.material_id;
        item_user_id := NEW.user_id;
        -- For simplicity in this complex logic, we treat UPDATE as DELETE OLD + INSERT NEW logic effectively, 
        -- but we need to be careful about order. 
        -- However, for now, let's handle INSERT and DELETE explicitly. 
        -- A robust UPDATE would revert OLD effects and apply NEW effects.
    END IF;

    -- Get current stock
    SELECT quantity, total_value INTO current_stock_qty, current_stock_value
    FROM stock
    WHERE material_id = item_material_id AND user_id = item_user_id;

    IF NOT FOUND THEN
        current_stock_qty := 0;
        current_stock_value := 0;
        -- Create stock record if not exists (only for INSERT/UPDATE)
        IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
            INSERT INTO stock (user_id, material_id, quantity, total_value)
            VALUES (item_user_id, item_material_id, 0, 0)
            RETURNING quantity, total_value INTO current_stock_qty, current_stock_value;
        END IF;
    END IF;

    -- Handle PURCHASES
    IF (TG_TABLE_NAME = 'purchases') THEN
        IF (TG_OP = 'INSERT') THEN
            -- Increment Stock and Value
            new_stock_qty := current_stock_qty + NEW.quantity;
            
            -- If stock was negative or zero, we just take the new value. 
            -- If positive, we add to it.
            IF (current_stock_qty <= 0) THEN
                new_stock_value := NEW.total_price;
            ELSE
                new_stock_value := current_stock_value + NEW.total_price;
            END IF;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;

        ELSIF (TG_OP = 'DELETE') THEN
            -- Revert Stock and Value
            new_stock_qty := current_stock_qty - OLD.quantity;
            new_stock_value := current_stock_value - OLD.total_price;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;
            
        ELSIF (TG_OP = 'UPDATE') THEN
            -- Revert OLD
            current_stock_qty := current_stock_qty - OLD.quantity;
            current_stock_value := current_stock_value - OLD.total_price;
            
            -- Apply NEW
            new_stock_qty := current_stock_qty + NEW.quantity;
            new_stock_value := current_stock_value + NEW.total_price;

             UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;
        END IF;

    -- Handle SALES
    ELSIF (TG_TABLE_NAME = 'sales') THEN
        IF (TG_OP = 'INSERT') THEN
            -- Check sufficiency
            IF (current_stock_qty < NEW.quantity) THEN
                RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_stock_qty, NEW.quantity;
            END IF;

            -- Calculate proportional cost
            -- Avoid division by zero
            IF (current_stock_qty > 0) THEN
                cost_proportional := (current_stock_value / current_stock_qty) * NEW.quantity;
            ELSE
                cost_proportional := 0;
            END IF;

            -- Update the SALE record with calculated cost and profit
            -- NOTE: In BEFORE INSERT trigger we would set NEW.cost_price. 
            -- But we need to update STOCK too. 
            -- Ideally this should be a BEFORE trigger to set fields, and AFTER to update stock.
            -- Or we update the row again. Let's try updating the row again to avoid complexity of multiple triggers for now, 
            -- OR better: Use a BEFORE trigger for calculation and AFTER for stock update? 
            -- Actually, we can just update the stock here. 
            -- But we can't update the NEW row in an AFTER trigger.
            -- So we will execute an UPDATE on the sales table.
            
            UPDATE sales 
            SET cost_price = cost_proportional, profit = (NEW.total_price - cost_proportional)
            WHERE id = NEW.id;

            -- Decrement Stock and Value
            new_stock_qty := current_stock_qty - NEW.quantity;
            new_stock_value := current_stock_value - cost_proportional;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;

        ELSIF (TG_OP = 'DELETE') THEN
            -- Revert Stock (Add back)
            new_stock_qty := current_stock_qty + OLD.quantity;
            new_stock_value := current_stock_value + OLD.cost_price;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;

        ELSIF (TG_OP = 'UPDATE') THEN
             -- Revert OLD
            current_stock_qty := current_stock_qty + OLD.quantity;
            current_stock_value := current_stock_value + OLD.cost_price;
            
            -- Check sufficiency for NEW
            IF (current_stock_qty < NEW.quantity) THEN
                RAISE EXCEPTION 'Estoque insuficiente para atualização. Disponível: %, Solicitado: %', current_stock_qty, NEW.quantity;
            END IF;

             -- Calculate NEW proportional cost based on the reverted stock state
            IF (current_stock_qty > 0) THEN
                cost_proportional := (current_stock_value / current_stock_qty) * NEW.quantity;
            ELSE
                cost_proportional := 0;
            END IF;
            
            -- We need to update the sales record's cost/profit if they changed
            -- Since this is AFTER UPDATE, we can update the table again, but need to avoid infinite recursion.
            -- To avoid recursion, check if cost_price matches.
            IF (NEW.cost_price IS DISTINCT FROM cost_proportional) THEN
                 UPDATE sales 
                SET cost_price = cost_proportional, profit = (NEW.total_price - cost_proportional)
                WHERE id = NEW.id;
            END IF;

            -- Apply NEW to Stock
            new_stock_qty := current_stock_qty - NEW.quantity;
            new_stock_value := current_stock_value - cost_proportional;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist to avoid conflicts
DROP TRIGGER IF EXISTS on_purchase_stock_update ON purchases;
DROP TRIGGER IF EXISTS on_sale_stock_update ON sales;

-- Create Triggers
CREATE TRIGGER on_purchase_stock_update
AFTER INSERT OR UPDATE OR DELETE ON purchases
FOR EACH ROW EXECUTE FUNCTION handle_transaction_stock_update();

CREATE TRIGGER on_sale_stock_update
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION handle_transaction_stock_update();
