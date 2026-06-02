import { useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

export function useBackgroundAudio() {
  const { 
    currentTrack, 
    isPlaying, 
    handlePlayPause, 
    handleNext, 
    handlePrevious, 
    audioRef 
  } = useMusicPlayer();

  useEffect(() => {
    if (!currentTrack) return;
    
    // Sync Media Session metadata
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.channel || 'Unknown Artist',
        album: 'DJ Mode',
        artwork: [
          { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '384x384', type: 'image/jpeg' },
          { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', async () => {
        if (audioRef.current && !isPlaying) {
          try {
            await audioRef.current.play();
            handlePlayPause();
          } catch (e) {
            console.error('Background play failed', e);
          }
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current && isPlaying) {
          audioRef.current.pause();
          handlePlayPause();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrevious();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNext();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [isPlaying, handlePlayPause, handleNext, handlePrevious, audioRef]);
}
