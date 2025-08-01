-- Add secure token column to tickets table
ALTER TABLE public.tickets ADD COLUMN secure_token UUID DEFAULT gen_random_uuid();

-- Create unique index on secure_token
CREATE UNIQUE INDEX idx_tickets_secure_token ON public.tickets(secure_token);

-- Update existing tickets with secure tokens
UPDATE public.tickets SET secure_token = gen_random_uuid() WHERE secure_token IS NULL;