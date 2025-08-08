-- Add the missing trigger for auto cancellation
CREATE TRIGGER auto_cancel_trigger
    AFTER UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_cancel_postponed_tickets();