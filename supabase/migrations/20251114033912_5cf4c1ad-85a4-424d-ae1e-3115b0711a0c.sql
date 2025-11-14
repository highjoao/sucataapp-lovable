-- Corrige o search_path da função handle_stock_update para segurança
create or replace function public.handle_stock_update()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.type = 'BUY' then
      update public.stock
      set quantity = quantity + NEW.quantity
      where material_id = NEW.material_id;
    elsif NEW.type = 'SELL' then
      update public.stock
      set quantity = quantity - NEW.quantity
      where material_id = NEW.material_id;
    end if;
  end if;
  return NEW;
end;
$$;

-- Corrige também a função antiga update_stock_on_transaction
create or replace function public.update_stock_on_transaction()
returns trigger 
language plpgsql
security definer
set search_path = public
as $$
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
$$;