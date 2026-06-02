import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

export function useListeningHistory() {
  const { user } = useAuth();

  const recordPlay = useCallback(async (track: Track) => {
    if (!user) return;

    try {
      await supabase.from('listening_history').insert({
        user_id: user.id,
        track_id: track.id,
        track_title: track.title,
        track_thumbnail: track.thumbnail,
        track_channel: track.channel,
      });
    } catch (error) {
      console.error('Failed to record listening history:', error);
    }
  }, [user]);

  return { recordPlay };
}
