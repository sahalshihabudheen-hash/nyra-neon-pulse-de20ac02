import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const trackUserLocation = async (accessToken: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-user-location`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAgent: navigator.userAgent,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        console.log('Location tracked:', data.location);
      }
    } catch (err) {
      console.warn('Location tracking failed:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.access_token) {
        trackUserLocation(session.access_token);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'SIGNED_IN' && session?.access_token) {
        trackUserLocation(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return { user, loading, signOut };
}
