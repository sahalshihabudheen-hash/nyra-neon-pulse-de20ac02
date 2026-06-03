import { supabase } from "@/integrations/supabase/client";

/**
 * Builds an Authorization header for calling edge functions.
 * Prefers the logged-in user's access token so backend functions can
 * enforce authentication. Falls back to the publishable key for any
 * truly-public function.
 */
export async function getFunctionAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return { Authorization: `Bearer ${token}` };
}
