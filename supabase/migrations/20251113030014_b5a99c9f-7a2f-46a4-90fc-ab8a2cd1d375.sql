-- Adiciona campo phone no profiles para integração WhatsApp
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adiciona índice para busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Adiciona comentário
COMMENT ON COLUMN public.profiles.phone IS 'Número de telefone do usuário para integração WhatsApp (formato: +5511999999999)';
