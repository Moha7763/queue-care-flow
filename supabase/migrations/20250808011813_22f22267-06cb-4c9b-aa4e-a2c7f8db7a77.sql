-- Create function to auto-cancel postponed tickets after 5 completed patients
CREATE OR REPLACE FUNCTION public.auto_cancel_postponed_tickets()
RETURNS TRIGGER AS $$
DECLARE
    ticket_record RECORD;
    completed_count INTEGER;
BEGIN
    -- Only process when a ticket is completed
    IF NEW.status = 'completed' AND OLD.status = 'current' THEN
        -- Check all postponed tickets for the same exam type and date
        FOR ticket_record IN 
            SELECT id, postpone_count, ticket_number, exam_type
            FROM public.tickets 
            WHERE status = 'postponed' 
            AND exam_type = NEW.exam_type 
            AND date = NEW.date
        LOOP
            -- Count completed tickets after this postponed ticket was created
            SELECT COUNT(*) INTO completed_count
            FROM public.tickets
            WHERE exam_type = NEW.exam_type
            AND date = NEW.date
            AND status = 'completed'
            AND created_at > (SELECT created_at FROM public.tickets WHERE id = ticket_record.id);
            
            -- If 5 or more patients have been completed after this postponed ticket, cancel it
            IF completed_count >= 5 THEN
                UPDATE public.tickets
                SET status = 'cancelled'
                WHERE id = ticket_record.id;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-cancellation
DROP TRIGGER IF EXISTS auto_cancel_postponed_trigger ON public.tickets;
CREATE TRIGGER auto_cancel_postponed_trigger
    AFTER UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_cancel_postponed_tickets();