-- Create a simple hash function without pgcrypto dependency
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Simple hash using built-in md5 function
  RETURN md5(password || 'salt_key_radiology_app');
END;
$function$;

-- Update all existing users with properly hashed passwords
UPDATE system_users SET password_hash = hash_password('admin') WHERE username = 'admin';
UPDATE system_users SET password_hash = hash_password('doctor') WHERE username = 'doctor';
UPDATE system_users SET password_hash = hash_password('doctor') WHERE username = 'doctor1';
UPDATE system_users SET password_hash = hash_password('staff') WHERE username = 'staff1';
UPDATE system_users SET password_hash = hash_password('staff') WHERE username = '1';