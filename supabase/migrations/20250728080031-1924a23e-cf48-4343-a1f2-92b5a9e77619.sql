-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the hash_password function to use the correct pgcrypto functions
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Use pgcrypto's digest function for password hashing
  RETURN encode(digest(password || 'salt_key', 'sha256'), 'hex');
END;
$function$;