-- Criar função para inicializar estoque ao criar material
CREATE OR REPLACE FUNCTION public.init_stock_for_material()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.stock (material_id, user_id, quantity) 
  VALUES (NEW.id, NEW.user_id, 0);
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função após inserir material
CREATE TRIGGER on_material_insert_init_stock
AFTER INSERT ON public.materials
FOR EACH ROW 
EXECUTE FUNCTION public.init_stock_for_material();