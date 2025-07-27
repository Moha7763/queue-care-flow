-- Insert default system users for testing
INSERT INTO public.system_users (username, password_hash, role) VALUES 
('admin', 'admin123', 'admin'),
('doctor1', 'doctor123', 'doctor'),
('staff1', 'staff123', 'staff')
ON CONFLICT (username) DO NOTHING;