-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create Policy for ALL operations (Select, Insert, Update, Delete)
CREATE POLICY "Users can manage their own clients"
ON public.clients
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
