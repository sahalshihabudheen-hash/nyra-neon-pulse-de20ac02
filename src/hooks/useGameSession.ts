import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface GameSessionData {
  game_name: string;
  track_playing?: string;
  track_source?: string;
}

export function useGameSession() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const startSession = useCallback(async (data: GameSessionData) => {
    if (!user) return null;

    try {
      startTimeRef.current = new Date();
      
      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user.id,
          user_email: user.email || 'unknown',
          game_name: data.game_name,
          track_playing: data.track_playing,
          track_source: data.track_source,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting game session:', error);
        return null;
      }

      setSessionId(session.id);
      console.log('Game session started:', session.id);
      return session.id;
    } catch (error) {
      console.error('Error starting game session:', error);
      return null;
    }
  }, [user]);

  const endSession = useCallback(async (score: number, gems: number) => {
    if (!sessionId || !user) return;

    try {
      const duration = startTimeRef.current 
        ? Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
        : 0;

      const { error } = await supabase
        .from('game_sessions')
        .update({
          score,
          gems_collected: gems,
          duration_seconds: duration,
          ended_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error ending game session:', error);
        return;
      }

      console.log('Game session ended:', sessionId, { score, gems, duration });
      setSessionId(null);
      startTimeRef.current = null;
    } catch (error) {
      console.error('Error ending game session:', error);
    }
  }, [sessionId, user]);

  const updateScore = useCallback(async (score: number, gems: number) => {
    if (!sessionId || !user) return;

    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({
          score,
          gems_collected: gems,
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating score:', error);
      }
    } catch (error) {
      console.error('Error updating score:', error);
    }
  }, [sessionId, user]);

  return {
    startSession,
    endSession,
    updateScore,
    isSessionActive: !!sessionId,
  };
}
