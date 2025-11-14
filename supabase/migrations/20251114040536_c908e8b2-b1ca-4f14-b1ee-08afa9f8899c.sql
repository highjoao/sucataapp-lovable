-- Adicionar coluna supplier_id na tabela purchases
ALTER TABLE public.purchases 
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);