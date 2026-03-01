import { useState, useCallback, useEffect } from 'react';

interface MemoryEntry {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  playCount: number;
  lastPlayed: number;
}

const STORAGE_KEY = 'nyra-music-memory';

export function useMusicMemory() {
  const [memory, setMemory] = useState<Record<string, MemoryEntry>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  }, [memory]);

  const recordPlay = useCallback((track: { id: string; title: string; thumbnail: string; channel: string }) => {
    setMemory(prev => ({
      ...prev,
      [track.id]: {
        ...track,
        playCount: (prev[track.id]?.playCount || 0) + 1,
        lastPlayed: Date.now(),
      },
    }));
  }, []);

  const getMostPlayed = useCallback((limit = 10): MemoryEntry[] => {
    return Object.values(memory)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit);
  }, [memory]);

  const getRecentlyPlayed = useCallback((limit = 10): MemoryEntry[] => {
    return Object.values(memory)
      .sort((a, b) => b.lastPlayed - a.lastPlayed)
      .slice(0, limit);
  }, [memory]);

  return { recordPlay, getMostPlayed, getRecentlyPlayed, memory };
}
