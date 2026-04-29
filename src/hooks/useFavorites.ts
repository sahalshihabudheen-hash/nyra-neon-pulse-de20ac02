import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface Favorite {
  id: string;
  user_id: string;
  track_id: string;
  track_title: string;
  track_thumbnail: string;
  track_channel: string;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addToFavorites = useCallback(async (track: Track) => {
    if (!user) {
      toast.error('Please login to add favorites');
      return false;
    }

    try {
      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        track_id: track.id,
        track_title: track.title,
        track_thumbnail: track.thumbnail,
        track_channel: track.channel,
      });

      if (error) {
        if (error.code === '23505') {
          toast.info('Already in favorites');
          return false;
        }
        throw error;
      }

      await fetchFavorites();
      toast.success('Added to favorites ❤️');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to favorites');
      return false;
    }
  }, [user, fetchFavorites]);

  const removeFromFavorites = useCallback(async (trackId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.track_id !== trackId));
      toast.success('Removed from favorites');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove from favorites');
      return false;
    }
  }, [user]);

  const toggleFavorite = useCallback(async (track: Track) => {
    const isFav = favorites.some(f => f.track_id === track.id);
    let success = false;
    if (isFav) {
      success = await removeFromFavorites(track.id);
    } else {
      success = await addToFavorites(track);
    }
    
    if (success) {
      await fetchFavorites(); // Force a clean refresh from the server
    }
    return success;
  }, [favorites, addToFavorites, removeFromFavorites, fetchFavorites]);


  const isFavorite = useCallback((trackId: string) => {
    return favorites.some(f => f.track_id === trackId);
  }, [favorites]);

  // Convert favorites to Track format for the player
  const favoriteTracks: Track[] = favorites.map(f => ({
    id: f.track_id,
    title: f.track_title,
    thumbnail: f.track_thumbnail,
    channel: f.track_channel,
  }));

  return {
    favorites,
    favoriteTracks,
    loading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
