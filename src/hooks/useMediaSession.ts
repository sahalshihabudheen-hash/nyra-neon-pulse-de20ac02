import { useEffect, useCallback } from 'react';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface UseMediaSessionProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function useMediaSession({
  currentTrack,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
}: UseMediaSessionProps) {
  // Update media session metadata when track changes
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.channel,
      album: 'NYRA Music',
      artwork: [
        { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '384x384', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
  }, [currentTrack]);

  // Update playback state
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // Set up action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => onPlay()],
      ['pause', () => onPause()],
      ['previoustrack', () => onPrevious()],
      ['nexttrack', () => onNext()],
      ['stop', () => onPause()],
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.log(`Media Session action "${action}" not supported.`);
      }
    }

    // Cleanup
    return () => {
      for (const [action] of actionHandlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [onPlay, onPause, onNext, onPrevious]);

  // Update position state (optional, for seek bar on lock screen)
  const updatePositionState = useCallback((duration: number, position: number) => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: Math.min(position, duration),
      });
    } catch (error) {
      // Ignore position state errors
    }
  }, []);

  return { updatePositionState };
}
