import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'nyra-drop-timestamps';

export function useDropDetector(trackId: string | undefined, currentTime: number) {
  const [drops, setDrops] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [dropActive, setDropActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drops));
  }, [drops]);

  // Check if current time hits a drop
  useEffect(() => {
    if (!trackId || !drops[trackId]) return;
    const timestamps = drops[trackId];
    const hit = timestamps.some(t => Math.abs(currentTime - t) < 0.6);
    if (hit && !dropActive) {
      setDropActive(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setDropActive(false), 2000);
    }
  }, [currentTime, trackId, drops, dropActive]);

  const addDrop = useCallback((trackId: string, timestamp: number) => {
    setDrops(prev => ({
      ...prev,
      [trackId]: [...(prev[trackId] || []), timestamp].sort((a, b) => a - b),
    }));
  }, []);

  const removeDrop = useCallback((trackId: string, index: number) => {
    setDrops(prev => ({
      ...prev,
      [trackId]: (prev[trackId] || []).filter((_, i) => i !== index),
    }));
  }, []);

  const getDrops = useCallback((trackId: string) => drops[trackId] || [], [drops]);

  return { dropActive, addDrop, removeDrop, getDrops };
}
