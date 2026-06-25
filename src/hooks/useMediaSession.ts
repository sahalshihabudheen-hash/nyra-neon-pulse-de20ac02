import { useEffect, useCallback, useRef } from 'react';

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
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
}

export function useMediaSession({
  currentTrack,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  audioRef,
}: UseMediaSessionProps) {
  // Keep a silent audio element running to maintain background state
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Create and maintain a silent audio context for background
  useEffect(() => {
    // Create a silent audio element that keeps the audio session alive
    if (!silentAudioRef.current) {
      const silentAudio = new Audio();
      // Use a data URI for a short silent audio
      silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      silentAudio.loop = true;
      silentAudio.volume = 0.01;
      silentAudioRef.current = silentAudio;
    }

    return () => {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
    };
  }, []);

  // Keep silent audio playing when main audio is playing (helps maintain background state)
  useEffect(() => {
    if (isPlaying && silentAudioRef.current) {
      silentAudioRef.current.play().catch(() => {});
    } else if (!isPlaying && silentAudioRef.current) {
      silentAudioRef.current.pause();
    }
  }, [isPlaying]);

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
      ['seekto', (details) => {
        if (audioRef?.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
        }
      }],
      ['seekbackward', (details) => {
        if (audioRef?.current) {
          const skipTime = details.seekOffset || 10;
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - skipTime, 0);
        }
      }],
      ['seekforward', (details) => {
        if (audioRef?.current) {
          const skipTime = details.seekOffset || 10;
          audioRef.current.currentTime = Math.min(
            audioRef.current.currentTime + skipTime,
            audioRef.current.duration || 0
          );
        }
      }],
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
  }, [onPlay, onPause, onNext, onPrevious, audioRef]);

  // Update position state (for seek bar on lock screen)
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
