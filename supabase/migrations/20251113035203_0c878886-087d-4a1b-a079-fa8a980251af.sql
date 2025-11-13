-- Create function to insert default materials for new users
CREATE OR REPLACE FUNCTION public.create_default_materials(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.materials (user_id, name, unit_of_measure) VALUES
    (p_user_id, 'COBRE MEL', 'KG'),
    (p_user_id, 'COBRE MISTO', 'KG'),
    (p_user_id, 'COBRE QUARTA', 'KG'),
    (p_user_id, 'RADIADOR ALUMÍNIO/COBRE', 'KG'),
    (p_user_id, 'FIO INSTALAÇÃO', 'KG'),
    (p_user_id, 'FIO MISTO', 'KG'),
    (p_user_id, 'LATÃO', 'KG'),
    (p_user_id, 'BRONZE', 'KG'),
    (p_user_id, 'PANELA', 'KG'),
    (p_user_id, 'CHAPA', 'KG'),
    (p_user_id, 'ESTAMPA', 'KG'),
    (p_user_id, 'CABO ALUMÍNIO', 'KG'),
    (p_user_id, 'PERFIL BRANCO', 'KG'),
    (p_user_id, 'PERFIL PINTADO', 'KG'),
    (p_user_id, 'PERFIL MISTO', 'KG'),
    (p_user_id, 'BLOCO LIMPO', 'KG'),
    (p_user_id, 'BLOCO MISTO', 'KG'),
    (p_user_id, 'LATINHA', 'KG'),
    (p_user_id, 'TUBINHO', 'KG'),
    (p_user_id, 'RODA', 'KG'),
    (p_user_id, 'INOX 304', 'KG'),
    (p_user_id, 'INOX FERROSO', 'KG'),
    (p_user_id, 'CHUMBO', 'KG'),
    (p_user_id, 'BATERIA', 'UN'),
    (p_user_id, 'CATALISADOR PEÇA', 'UN'),
    (p_user_id, 'CATALISADOR KG', 'KG'),
    (p_user_id, 'PLACA LISA', 'KG'),
    (p_user_id, 'PLACA MARROM', 'KG'),
    (p_user_id, 'PLACA PESADA', 'KG'),
    (p_user_id, 'PLACA INTERMEDIÁRIA', 'KG'),
    (p_user_id, 'PLACA MÃE VERDE', 'UN'),
    (p_user_id, 'PLACA MÃE COLORIA', 'UN'),
    (p_user_id, 'PLACA LEVE', 'KG'),
    (p_user_id, 'PLACA TELEFONIA', 'UN'),
    (p_user_id, 'PLACA DOURADA', 'UN'),
    (p_user_id, 'PROCESSADOR', 'UN'),
    (p_user_id, 'MEMÓRIA', 'UN'),
    (p_user_id, 'HD', 'UN'),
    (p_user_id, 'TAPETE', 'UN');
END;
$$;

-- Update the handle_new_user function to also create default materials
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Create default materials
  PERFORM create_default_materials(NEW.id);
  
  RETURN NEW;
END;
$$;