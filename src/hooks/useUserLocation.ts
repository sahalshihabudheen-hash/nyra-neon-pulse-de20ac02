import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserLocation {
  country: string | null;
  state: string | null;
  city: string | null;
}

export function useUserLocation() {
  const { user } = useAuth();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('user_locations')
          .select('country, state, city')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setLocation(data || null);
      } catch (err) {
        console.error('Failed to fetch user location:', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [user]);

  return { location, loading };
}
