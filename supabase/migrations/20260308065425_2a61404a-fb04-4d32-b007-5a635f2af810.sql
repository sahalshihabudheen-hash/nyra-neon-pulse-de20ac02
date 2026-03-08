ALTER TABLE public.user_locations ADD COLUMN IF NOT EXISTS device_type text DEFAULT NULL;
ALTER TABLE public.user_locations ADD COLUMN IF NOT EXISTS device_info text DEFAULT NULL;
ALTER TABLE public.user_locations ADD COLUMN IF NOT EXISTS user_agent text DEFAULT NULL;