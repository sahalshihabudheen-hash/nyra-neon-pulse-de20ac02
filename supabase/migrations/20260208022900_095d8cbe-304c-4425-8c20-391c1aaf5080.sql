
-- Create user_locations table to store geolocation data
CREATE TABLE public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  country TEXT,
  state TEXT,
  city TEXT,
  ip_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timezone TEXT,
  isp TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Users can upsert their own location
CREATE POLICY "Users can insert their own location"
  ON public.user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
  ON public.user_locations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view their own location
CREATE POLICY "Users can view their own location"
  ON public.user_locations FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all locations
CREATE POLICY "Admins can view all locations"
  ON public.user_locations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster admin queries
CREATE INDEX idx_user_locations_user_id ON public.user_locations(user_id);
