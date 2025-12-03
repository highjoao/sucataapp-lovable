-- Drop potential legacy triggers on TRANSACTIONS table
DROP TRIGGER IF EXISTS on_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS on_transaction_insert_update_stock ON transactions;
DROP TRIGGER IF EXISTS update_stock_on_transaction ON transactions;
DROP TRIGGER IF EXISTS handle_stock_update ON transactions;

-- Drop potential legacy triggers on PURCHASES table
DROP TRIGGER IF EXISTS on_purchase_stock_update ON purchases;
DROP TRIGGER IF EXISTS on_purchase_created ON purchases;
DROP TRIGGER IF EXISTS update_stock_on_purchase ON purchases;
DROP TRIGGER IF EXISTS handle_purchase_stock ON purchases;
DROP TRIGGER IF EXISTS purchase_stock_trigger ON purchases;

-- Drop potential legacy triggers on SALES table
DROP TRIGGER IF EXISTS on_sale_stock_update ON sales;
DROP TRIGGER IF EXISTS on_sale_created ON sales;
DROP TRIGGER IF EXISTS update_stock_on_sale ON sales;
DROP TRIGGER IF EXISTS handle_sale_stock ON sales;
DROP TRIGGER IF EXISTS sale_stock_trigger ON sales;

-- Re-create the correct function
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
    IF (TG_OP = 'INSERT') THEN
        item_material_id := NEW.material_id;
        item_user_id := NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        item_material_id := OLD.material_id;
        item_user_id := OLD.user_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        item_material_id := NEW.material_id;
        item_user_id := NEW.user_id;
    END IF;

    SELECT quantity, total_value INTO current_stock_qty, current_stock_value
    FROM stock
    WHERE material_id = item_material_id AND user_id = item_user_id;

    IF NOT FOUND THEN
        current_stock_qty := 0;
        current_stock_value := 0;
        IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
            INSERT INTO stock (user_id, material_id, quantity, total_value)
            VALUES (item_user_id, item_material_id, 0, 0)
            RETURNING quantity, total_value INTO current_stock_qty, current_stock_value;
        END IF;
    END IF;

    IF (TG_TABLE_NAME = 'purchases') THEN
        IF (TG_OP = 'INSERT') THEN
            new_stock_qty := current_stock_qty + NEW.quantity;
            IF (current_stock_qty <= 0) THEN
                new_stock_value := NEW.total_price;
            ELSE
                new_stock_value := current_stock_value + NEW.total_price;
            END IF;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;

        ELSIF (TG_OP = 'DELETE') THEN
            new_stock_qty := current_stock_qty - OLD.quantity;
            new_stock_value := current_stock_value - OLD.total_price;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;
            
        ELSIF (TG_OP = 'UPDATE') THEN
            current_stock_qty := current_stock_qty - OLD.quantity;
            current_stock_value := current_stock_value - OLD.total_price;
            
            new_stock_qty := current_stock_qty + NEW.quantity;
            new_stock_value := current_stock_value + NEW.total_price;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;
        END IF;

    ELSIF (TG_TABLE_NAME = 'sales') THEN
        IF (TG_OP = 'INSERT') THEN
            IF (current_stock_qty < NEW.quantity) THEN
                RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %', current_stock_qty, NEW.quantity;
            END IF;

            IF (current_stock_qty > 0) THEN
                cost_proportional := (current_stock_value / current_stock_qty) * NEW.quantity;
            ELSE
                cost_proportional := 0;
            END IF;

            UPDATE sales 
            SET cost_price = cost_proportional, profit = (NEW.total_price - cost_proportional)
            WHERE id = NEW.id;

            new_stock_qty := current_stock_qty - NEW.quantity;
            new_stock_value := current_stock_value - cost_proportional;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;

        ELSIF (TG_OP = 'DELETE') THEN
            new_stock_qty := current_stock_qty + OLD.quantity;
            new_stock_value := current_stock_value + OLD.cost_price;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;

        ELSIF (TG_OP = 'UPDATE') THEN
            current_stock_qty := current_stock_qty + OLD.quantity;
            current_stock_value := current_stock_value + OLD.cost_price;
            
            IF (current_stock_qty < NEW.quantity) THEN
                RAISE EXCEPTION 'Estoque insuficiente para atualização. Disponível: %, Solicitado: %', current_stock_qty, NEW.quantity;
            END IF;

            IF (current_stock_qty > 0) THEN
                cost_proportional := (current_stock_value / current_stock_qty) * NEW.quantity;
            ELSE
                cost_proportional := 0;
            END IF;
            
            IF (NEW.cost_price IS DISTINCT FROM cost_proportional) THEN
                UPDATE sales 
                SET cost_price = cost_proportional, profit = (NEW.total_price - cost_proportional)
                WHERE id = NEW.id;
            END IF;

            new_stock_qty := current_stock_qty - NEW.quantity;
            new_stock_value := current_stock_value - cost_proportional;

            UPDATE stock 
            SET quantity = new_stock_qty, total_value = new_stock_value, updated_at = NOW()
            WHERE material_id = item_material_id AND user_id = item_user_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create Triggers
CREATE TRIGGER on_purchase_stock_update
AFTER INSERT OR UPDATE OR DELETE ON purchases
FOR EACH ROW EXECUTE FUNCTION handle_transaction_stock_update();

CREATE TRIGGER on_sale_stock_update
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION handle_transaction_stock_update();