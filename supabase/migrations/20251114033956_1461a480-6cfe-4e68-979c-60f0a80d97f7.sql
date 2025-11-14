-- Corrige o search_path de todas as funções restantes para segurança

-- create_default_materials
create or replace function public.create_default_materials(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

-- update_updated_at_column
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Create default materials
  PERFORM create_default_materials(NEW.id);
  
  RETURN NEW;
END;
$$;

-- handle_new_user_subscription
create or replace function public.handle_new_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;