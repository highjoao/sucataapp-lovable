-- FASE 1: Estrutura de dados e segurança para SucataApp

-- 1. Tabela de Fornecedores
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para suppliers
CREATE POLICY "Allow users to read their own suppliers"
ON suppliers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create their own suppliers"
ON suppliers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own suppliers"
ON suppliers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own suppliers"
ON suppliers FOR DELETE
USING (auth.uid() = user_id);

-- 2. Atualizar tabela materials (já existe, mas vamos garantir unicidade)
ALTER TABLE materials 
  DROP CONSTRAINT IF EXISTS materials_user_name_unique;

ALTER TABLE materials 
  ADD CONSTRAINT materials_user_name_unique UNIQUE(user_id, name);

ALTER TABLE materials
  RENAME COLUMN unit TO unit_of_measure;

-- 3. Tabela de Estoque
CREATE TABLE stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 0,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para stock
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para stock
CREATE POLICY "Allow users to read their own stock"
ON stock FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create their own stock"
ON stock FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own stock"
ON stock FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own stock"
ON stock FOR DELETE
USING (auth.uid() = user_id);

-- 4. Tabela de Transações
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  quantity DECIMAL(10, 3) NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT now(),
  material_id UUID REFERENCES materials(id) ON DELETE RESTRICT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para transactions
CREATE POLICY "Allow users to read their own transactions"
ON transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create their own transactions"
ON transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own transactions"
ON transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own transactions"
ON transactions FOR DELETE
USING (auth.uid() = user_id);

-- 5. Função para atualizar o estoque automaticamente
CREATE OR REPLACE FUNCTION update_stock_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não houver entrada de estoque para este material, crie uma.
  INSERT INTO stock (material_id, user_id, quantity)
  VALUES (NEW.material_id, NEW.user_id, 0)
  ON CONFLICT (material_id) DO NOTHING;

  -- Atualiza a quantidade no estoque
  IF NEW.type = 'BUY' THEN
    UPDATE stock SET quantity = quantity + NEW.quantity, updated_at = now() WHERE material_id = NEW.material_id;
  ELSIF NEW.type = 'SELL' THEN
    -- Verificação para não deixar estoque negativo
    IF (SELECT quantity FROM stock WHERE material_id = NEW.material_id) < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para realizar a venda.';
    END IF;
    UPDATE stock SET quantity = quantity - NEW.quantity, updated_at = now() WHERE material_id = NEW.material_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Trigger que chama a função após cada inserção em 'transactions'
CREATE TRIGGER on_transaction_insert
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION update_stock_on_transaction();