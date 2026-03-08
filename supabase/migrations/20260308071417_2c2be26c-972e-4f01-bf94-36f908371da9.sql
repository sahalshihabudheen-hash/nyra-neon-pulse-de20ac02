
-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Anyone can read settings"
  ON public.app_settings
  FOR SELECT
  TO public
  USING (true);
