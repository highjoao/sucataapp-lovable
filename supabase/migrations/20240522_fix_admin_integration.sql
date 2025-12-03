-- Add Foreign Key to allow joining profiles and subscriptions
-- subscriptions.user_id already references auth.users
-- We add a reference to public.profiles to enable PostgREST resource embedding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_subscriptions_profiles'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD CONSTRAINT fk_subscriptions_profiles 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure RLS allows Admins to view everything (redundant but safe)
-- (Already handled in previous migration, but good to double check if user ran it)
