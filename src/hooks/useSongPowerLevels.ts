import { useState, useCallback, useEffect } from 'react';

export interface PowerLevels {
  hype: number;
  chill: number;
  aggression: number;
}

const STORAGE_KEY = 'nyra-song-power-levels';

export function useSongPowerLevels() {
  const [allLevels, setAllLevels] = useState<Record<string, PowerLevels>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLevels));
  }, [allLevels]);

  const getLevels = useCallback((trackId: string): PowerLevels => {
    return allLevels[trackId] || { hype: 50, chill: 50, aggression: 30 };
  }, [allLevels]);

  const setLevels = useCallback((trackId: string, levels: Partial<PowerLevels>) => {
    setAllLevels(prev => ({
      ...prev,
      [trackId]: { ...(prev[trackId] || { hype: 50, chill: 50, aggression: 30 }), ...levels },
    }));
  }, []);

  return { getLevels, setLevels };
}
