import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const AVAILABLE_GENRES = [
  "Pop", "Hip-Hop", "Rock", "R&B", "Electronic", "Bollywood", "K-Pop", "Latin"
];

interface UserPreferences {
  genres: string[];
  onboarding_complete: boolean;
  tutorial_complete: boolean;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setShowOnboarding(true);
        setShowTutorial(true);
        setPreferences(null);
      } else {
        setPreferences({
          genres: data.genres || [],
          onboarding_complete: data.onboarding_complete,
          tutorial_complete: data.tutorial_complete ?? false,
        });
        setShowOnboarding(!data.onboarding_complete);
        setShowTutorial(!data.tutorial_complete);
      }
    } catch (err) {
      console.warn('Failed to fetch preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = useCallback(async (genres: string[]) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          genres,
          onboarding_complete: true,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setPreferences(prev => ({ genres, onboarding_complete: true, tutorial_complete: prev?.tutorial_complete ?? false }));
      setShowOnboarding(false);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  }, [user]);

  const completeTutorial = useCallback(async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          tutorial_complete: true,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, tutorial_complete: true } : { genres: [], onboarding_complete: false, tutorial_complete: true });
      setShowTutorial(false);
    } catch (err) {
      console.error('Failed to complete tutorial:', err);
    }
  }, [user]);

  return { preferences, loading, showOnboarding, setShowOnboarding, savePreferences, showTutorial, completeTutorial };
}
