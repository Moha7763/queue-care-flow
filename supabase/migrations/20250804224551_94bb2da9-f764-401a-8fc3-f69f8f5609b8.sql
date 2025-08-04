-- Add emergency_type column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN emergency_type text;

-- Add comment to explain the emergency types
COMMENT ON COLUMN public.tickets.emergency_type IS 'Emergency priority: urgent, critical, emergency';