-- Allow admins to delete any playlist
CREATE POLICY "Admins can delete any playlist"
ON public.playlists
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any playlist items
CREATE POLICY "Admins can delete any playlist items"
ON public.playlist_items
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));