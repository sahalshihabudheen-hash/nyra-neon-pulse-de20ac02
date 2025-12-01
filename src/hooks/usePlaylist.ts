import { useState, useEffect, useCallback } from 'react';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

const PLAYLIST_STORAGE_KEY = 'nyra-playlist';

export function usePlaylist() {
  const [playlist, setPlaylist] = useState<Track[]>([]);

  // Load playlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    if (stored) {
      try {
        setPlaylist(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse playlist:', e);
      }
    }
  }, []);

  // Save playlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlist));
  }, [playlist]);

  const addToPlaylist = useCallback((track: Track) => {
    setPlaylist(prev => {
      // Check if track already exists
      if (prev.some(t => t.id === track.id)) {
        return prev;
      }
      return [...prev, track];
    });
  }, []);

  const removeFromPlaylist = useCallback((trackId: string) => {
    setPlaylist(prev => prev.filter(t => t.id !== trackId));
  }, []);

  const clearPlaylist = useCallback(() => {
    setPlaylist([]);
  }, []);

  const isInPlaylist = useCallback((trackId: string) => {
    return playlist.some(t => t.id === trackId);
  }, [playlist]);

  const getTrackIndex = useCallback((trackId: string) => {
    return playlist.findIndex(t => t.id === trackId);
  }, [playlist]);

  const getNextTrack = useCallback((currentId: string) => {
    const index = playlist.findIndex(t => t.id === currentId);
    if (index === -1 || playlist.length === 0) return null;
    const nextIndex = (index + 1) % playlist.length;
    return playlist[nextIndex];
  }, [playlist]);

  const getPreviousTrack = useCallback((currentId: string) => {
    const index = playlist.findIndex(t => t.id === currentId);
    if (index === -1 || playlist.length === 0) return null;
    const prevIndex = index <= 0 ? playlist.length - 1 : index - 1;
    return playlist[prevIndex];
  }, [playlist]);

  return {
    playlist,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    isInPlaylist,
    getTrackIndex,
    getNextTrack,
    getPreviousTrack,
  };
}
