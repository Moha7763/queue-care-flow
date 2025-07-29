-- Update daily_settings to use random starting numbers instead of 1
-- Function to generate random starting numbers for each exam type
CREATE OR REPLACE FUNCTION generate_random_start_numbers()
RETURNS VOID AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Insert or update daily settings with random starting numbers
    INSERT INTO public.daily_settings (
        date,
        xray_start_number,
        ultrasound_start_number,
        ct_scan_start_number,
        mri_start_number
    ) VALUES (
        today_date,
        (RANDOM() * 900 + 100)::INTEGER,  -- Random number between 100-999
        (RANDOM() * 900 + 100)::INTEGER,  -- Random number between 100-999
        (RANDOM() * 900 + 100)::INTEGER,  -- Random number between 100-999
        (RANDOM() * 900 + 100)::INTEGER   -- Random number between 100-999
    )
    ON CONFLICT (date) DO UPDATE SET
        xray_start_number = (RANDOM() * 900 + 100)::INTEGER,
        ultrasound_start_number = (RANDOM() * 900 + 100)::INTEGER,
        ct_scan_start_number = (RANDOM() * 900 + 100)::INTEGER,
        mri_start_number = (RANDOM() * 900 + 100)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;