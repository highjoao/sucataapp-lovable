-- 1. Cria a Função de Atualização de Estoque
create or replace function public.handle_stock_update()
returns trigger as $$
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
$$ language plpgsql security definer;

-- 2. Cria o Gatilho (Trigger) na Tabela de Transações
drop trigger if exists on_transaction_insert_update_stock on public.transactions;
create trigger on_transaction_insert_update_stock
  after insert on public.transactions
  for each row execute procedure public.handle_stock_update();