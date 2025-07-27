-- Fix function search path security issue
DROP FUNCTION IF EXISTS public.hash_password(text);

CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Simple hash function for demo purposes - in production, use proper bcrypt
  RETURN encode(digest(password || 'salt_key', 'sha256'), 'hex');
END;
$$;