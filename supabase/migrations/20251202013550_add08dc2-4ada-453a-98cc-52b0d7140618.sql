-- Create playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_items table
CREATE TABLE public.playlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_thumbnail TEXT NOT NULL,
  track_channel TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playlists
CREATE POLICY "Users can view their own playlists"
ON public.playlists FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists"
ON public.playlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
ON public.playlists FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
ON public.playlists FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for playlist_items
CREATE POLICY "Users can view items in their playlists"
ON public.playlist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add items to their playlists"
ON public.playlist_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update items in their playlists"
ON public.playlist_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete items from their playlists"
ON public.playlist_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_items.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX idx_playlist_items_playlist_id ON public.playlist_items(playlist_id);
CREATE INDEX idx_playlist_items_track_id ON public.playlist_items(track_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();