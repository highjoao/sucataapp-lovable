-- Reset user data function
CREATE OR REPLACE FUNCTION reset_user_data()
RETURNS VOID AS $$
BEGIN
  DELETE FROM sales WHERE user_id = auth.uid();
  DELETE FROM purchases WHERE user_id = auth.uid();
  DELETE FROM transactions WHERE user_id = auth.uid();
  DELETE FROM stock WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add total_value column to stock table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock' AND column_name = 'total_value') THEN
        ALTER TABLE stock ADD COLUMN total_value NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Create or replace the trigger function for stock management
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_purchase_stock_update ON purchases;
DROP TRIGGER IF EXISTS on_sale_stock_update ON sales;

-- Create Triggers
CREATE TRIGGER on_purchase_stock_update
AFTER INSERT OR UPDATE OR DELETE ON purchases
FOR EACH ROW EXECUTE FUNCTION handle_transaction_stock_update();

CREATE TRIGGER on_sale_stock_update
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION handle_transaction_stock_update();

-- Update get_user_stock function
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
$function$;

-- Add supplier_id to sales if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'supplier_id') THEN
        ALTER TABLE public.sales ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);
        CREATE INDEX IF NOT EXISTS idx_sales_supplier_id ON public.sales(supplier_id);
    END IF;
END $$;

-- Add phone column to profiles if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;
END $$;