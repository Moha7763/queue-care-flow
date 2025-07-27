-- Add password hashing function
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple hash function for demo purposes - in production, use proper bcrypt
  RETURN encode(digest(password || 'salt_key', 'sha256'), 'hex');
END;
$$;

-- Update existing passwords to be hashed
UPDATE public.system_users 
SET password_hash = public.hash_password(password_hash);

-- Add users management table for better tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.system_users(id) ON DELETE CASCADE,
    last_login timestamp with time zone DEFAULT now(),
    login_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_sessions
CREATE POLICY "Admin can view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can insert sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (true);