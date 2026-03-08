CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed to check maintenance mode)
CREATE POLICY "Anyone can read settings" ON public.app_settings
  FOR SELECT USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can insert settings" ON public.app_settings
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings" ON public.app_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings" ON public.app_settings
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Insert default maintenance mode setting
INSERT INTO public.app_settings (key, value) VALUES 
  ('maintenance_mode', '{"enabled": false, "allowed_emails": []}'::jsonb);