-- Create listening history table to track what users play
CREATE TABLE public.listening_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_thumbnail TEXT NOT NULL,
  track_channel TEXT NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_listening_history_user_id ON public.listening_history(user_id);
CREATE INDEX idx_listening_history_played_at ON public.listening_history(played_at DESC);

-- Enable RLS
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;

-- Users can insert their own listening history
CREATE POLICY "Users can add to their own history"
ON public.listening_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own history
CREATE POLICY "Users can view their own history"
ON public.listening_history
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all listening history
CREATE POLICY "Admins can view all listening history"
ON public.listening_history
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all playlists (add policy to playlists table)
CREATE POLICY "Admins can view all playlists"
ON public.playlists
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all playlist items
CREATE POLICY "Admins can view all playlist items"
ON public.playlist_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM playlists p 
  WHERE p.id = playlist_items.playlist_id 
  AND public.has_role(auth.uid(), 'admin')
));