-- Create artists table
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  bio TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create albums table
CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  album_name TEXT NOT NULL,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create songs table
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Artists policies
CREATE POLICY "Anyone can view artists" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Users can create their own artist profile" ON public.artists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Artists can update their own profile" ON public.artists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Artists can delete their own profile" ON public.artists FOR DELETE USING (auth.uid() = user_id);

-- Albums policies
CREATE POLICY "Anyone can view albums" ON public.albums FOR SELECT USING (true);
CREATE POLICY "Artists can create albums" ON public.albums FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.artists WHERE artists.id = albums.artist_id AND artists.user_id = auth.uid())
);
CREATE POLICY "Artists can update their albums" ON public.albums FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.artists WHERE artists.id = albums.artist_id AND artists.user_id = auth.uid())
);
CREATE POLICY "Artists can delete their albums" ON public.albums FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.artists WHERE artists.id = albums.artist_id AND artists.user_id = auth.uid())
);

-- Songs policies
CREATE POLICY "Anyone can view songs" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Artists can add songs" ON public.songs FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.albums a
    JOIN public.artists ar ON a.artist_id = ar.id
    WHERE a.id = songs.album_id AND ar.user_id = auth.uid()
  )
);
CREATE POLICY "Artists can update their songs" ON public.songs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.albums a
    JOIN public.artists ar ON a.artist_id = ar.id
    WHERE a.id = songs.album_id AND ar.user_id = auth.uid()
  )
);
CREATE POLICY "Artists can delete their songs" ON public.songs FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.albums a
    JOIN public.artists ar ON a.artist_id = ar.id
    WHERE a.id = songs.album_id AND ar.user_id = auth.uid()
  )
);

-- Triggers
CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON public.artists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON public.albums
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('album-covers', 'album-covers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('artist-songs', 'artist-songs', true);

-- Storage policies for album-covers
CREATE POLICY "Public album covers" ON storage.objects FOR SELECT USING (bucket_id = 'album-covers');
CREATE POLICY "Auth upload album covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'album-covers' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update album covers" ON storage.objects FOR UPDATE USING (bucket_id = 'album-covers' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete album covers" ON storage.objects FOR DELETE USING (bucket_id = 'album-covers' AND auth.role() = 'authenticated');

-- Storage policies for artist-songs
CREATE POLICY "Public artist songs" ON storage.objects FOR SELECT USING (bucket_id = 'artist-songs');
CREATE POLICY "Auth upload artist songs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'artist-songs' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update artist songs" ON storage.objects FOR UPDATE USING (bucket_id = 'artist-songs' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete artist songs" ON storage.objects FOR DELETE USING (bucket_id = 'artist-songs' AND auth.role() = 'authenticated');