
CREATE TABLE public.lyrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id TEXT NOT NULL UNIQUE,
  track_title TEXT NOT NULL,
  track_channel TEXT NOT NULL,
  lyrics_text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lyrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lyrics" ON public.lyrics FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert lyrics" ON public.lyrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update lyrics" ON public.lyrics FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete lyrics" ON public.lyrics FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
