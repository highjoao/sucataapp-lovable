-- Remove o trigger duplicado que está causando a duplicação de atualização de estoque
DROP TRIGGER IF EXISTS on_transaction_insert_update_stock ON public.transactions;

-- Remove a função antiga que não está mais sendo usada
DROP FUNCTION IF EXISTS public.handle_stock_update();