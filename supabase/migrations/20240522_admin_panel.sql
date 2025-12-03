-- 1. Add columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- 2. Create access_logs table
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on access_logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- 3. Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS Policies

-- Profiles: Admins can view/edit all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Subscriptions: Admins can view/edit all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Access Logs: Admins can view all logs
CREATE POLICY "Admins can view all access_logs"
ON public.access_logs FOR SELECT
USING (public.is_admin(auth.uid()));

-- Allow system/users to insert logs (e.g. on login) - simplified for now
CREATE POLICY "Users can insert their own logs"
ON public.access_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Set current user as admin (Placeholder - User needs to replace UUID or run manually)
-- UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid(); 
-- Since we can't know the ID here easily without context, we leave this commented.
-- The user should run: UPDATE profiles SET role = 'admin' WHERE id = 'THEIR_UUID';
