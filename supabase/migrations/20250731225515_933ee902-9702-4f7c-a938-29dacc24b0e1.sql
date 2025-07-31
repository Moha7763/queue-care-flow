-- Enable realtime for tickets table
ALTER TABLE public.tickets REPLICA IDENTITY FULL;

-- Add tickets table to realtime publication
-- This will enable real-time updates for the tickets table
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_settings;