-- 1. app_settings: hide sensitive YouTube key entries from non-admins
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;

CREATE POLICY "Public can read non-sensitive settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key NOT IN ('extra_youtube_keys', 'backup_youtube_keys', 'disabled_youtube_keys'));

CREATE POLICY "Admins can read all settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. profiles: restrict public read to authenticated users only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 3. storage: ownership-based write policies for album-covers
DROP POLICY IF EXISTS "Auth upload album covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth update album covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete album covers" ON storage.objects;

CREATE POLICY "Artists can upload their own album covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'album-covers'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can update their own album covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'album-covers'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can delete their own album covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'album-covers'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

-- 4. storage: ownership-based write policies for artist-songs
DROP POLICY IF EXISTS "Auth upload artist songs" ON storage.objects;
DROP POLICY IF EXISTS "Auth update artist songs" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete artist songs" ON storage.objects;

CREATE POLICY "Artists can upload their own songs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artist-songs'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can update their own songs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artist-songs'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Artists can delete their own songs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artist-songs'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.user_id = auth.uid()
  )
);

-- 5. Stop broadcasting game_sessions over realtime (no client subscribes to it)
ALTER PUBLICATION supabase_realtime DROP TABLE public.game_sessions;
