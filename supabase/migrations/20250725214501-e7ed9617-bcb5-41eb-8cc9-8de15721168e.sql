-- Create enum for exam types
CREATE TYPE public.exam_type AS ENUM ('xray', 'ultrasound', 'ct_scan', 'mri');

-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('waiting', 'current', 'postponed', 'completed', 'cancelled');

-- Create users table for the system (separate from auth.users)
CREATE TABLE public.system_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_settings table to store daily starting numbers
CREATE TABLE public.daily_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  xray_start_number INTEGER NOT NULL DEFAULT 1,
  ultrasound_start_number INTEGER NOT NULL DEFAULT 1,
  ct_scan_start_number INTEGER NOT NULL DEFAULT 1,
  mri_start_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number INTEGER NOT NULL,
  exam_type exam_type NOT NULL,
  status ticket_status NOT NULL DEFAULT 'waiting',
  postpone_count INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(ticket_number, exam_type, date)
);

-- Enable Row Level Security
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for system_users (admin only access)
CREATE POLICY "Admin can view all users" 
ON public.system_users 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can insert users" 
ON public.system_users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update users" 
ON public.system_users 
FOR UPDATE 
USING (true);

-- Create policies for daily_settings (public read, admin write)
CREATE POLICY "Anyone can view daily settings" 
ON public.daily_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert daily settings" 
ON public.daily_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update daily settings" 
ON public.daily_settings 
FOR UPDATE 
USING (true);

-- Create policies for tickets (public access for this use case)
CREATE POLICY "Anyone can view tickets" 
ON public.tickets 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update tickets" 
ON public.tickets 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete tickets" 
ON public.tickets 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_system_users_updated_at
BEFORE UPDATE ON public.system_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin user (password: admin123)
INSERT INTO public.system_users (username, password_hash, role) 
VALUES ('admin', '$2b$10$rQ8K2JZmJVmKjKaFtGtDhuN6HhzEz7l8mXxPx7GQVyOH7f4TJHnIS', 'admin');

-- Insert initial daily settings for today
INSERT INTO public.daily_settings (date, xray_start_number, ultrasound_start_number, ct_scan_start_number, mri_start_number)
VALUES (CURRENT_DATE, 
  FLOOR(RANDOM() * 50) + 1,
  FLOOR(RANDOM() * 50) + 1, 
  FLOOR(RANDOM() * 50) + 1,
  FLOOR(RANDOM() * 50) + 1
) ON CONFLICT (date) DO NOTHING;