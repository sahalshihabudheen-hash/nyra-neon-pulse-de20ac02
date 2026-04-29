import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { usePlaylist } from '@/hooks/usePlaylist';
import { useQueue } from '@/hooks/useQueue';
import { useFavorites } from '@/hooks/useFavorites';
import { useListeningHistory } from '@/hooks/useListeningHistory';
import { useTheme } from '@/contexts/ThemeContext';
import { useTabTitle } from '@/hooks/useTabTitle';

export interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface MusicPlayerContextType {
  // Playback state
  currentTrack: Track | null;
  isPlaying: boolean;
  useBackgroundAudioMode: boolean;

  // Player refs
  ytPlayerRef: React.MutableRefObject<any>;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;

  // Actions
  handlePlayTrack: (track: Track, trackList?: Track[]) => void;
  handlePlayPause: () => void;
  handleNext: () => void;
  handlePrevious: () => void;
  handlePlayFromPlaylist: (track: Track) => void;
  handlePlayFromQueue: (track: Track) => void;
  handleAddToPlaylist: (track: Track) => void;
  handleAddToQueue: (track: Track) => void;
  handleRemoveFromPlaylist: (trackId: string) => void;
  handleClearPlaylist: () => void;

  // Playlist & Queue
  playlist: Track[];
  queue: Track[];
  isInPlaylist: (trackId: string) => boolean;
  removeFromQueue: (trackId: string) => void;
  reorderPlaylist: (startIndex: number, endIndex: number) => void;
  shuffleMode: boolean;
  toggleShuffle: () => void;
  loopMode: 'off' | 'all' | 'one';
  cycleLoopMode: () => void;

  // Favorites
  isFavorite: (trackId: string) => boolean;
  toggleFavorite: (track: Track) => Promise<boolean>;

  // Track list context (search results / famous songs)
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;

  // Mini player visibility
  showMiniPlayer: boolean;
  setShowMiniPlayer: React.Dispatch<React.SetStateAction<boolean>>;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  return ctx;
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useTheme();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playingFromPlaylist, setPlayingFromPlaylist] = useState(false);
  const [useBackgroundAudioMode, setUseBackgroundAudioMode] = useState(true);
  const [ytApiReady, setYtApiReady] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [loopMode, setLoopMode] = useState<'off' | 'all' | 'one'>(() => {
    return (localStorage.getItem('nyra-loop-mode') as 'off' | 'all' | 'one') || 'off';
  });

  // Track which audio source is active to prevent state conflicts
  const activeSourceRef = useRef<'youtube' | 'background' | null>(null);

  const ytPlayerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleNextRef = useRef<() => void>();

  const {
    playlist, addToPlaylist, removeFromPlaylist, clearPlaylist,
    isInPlaylist, getNextTrack, getPreviousTrack, reorderPlaylist,
  } = usePlaylist();

  const {
    queue, addToQueue, removeFromQueue, clearQueue,
    getNextFromQueue, shuffleMode, toggleShuffle, setLastPlayed,
  } = useQueue();

  const { isFavorite, toggleFavorite } = useFavorites();
  const { recordPlay } = useListeningHistory();

  // Create background audio element on mount
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      (audio as any).playsInline = true;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (settings.autoPlayNext && handleNextRef.current) {
        handleNextRef.current();
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      console.error('Audio error, falling back to YouTube player');
      setUseBackgroundAudioMode(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [settings.autoPlayNext]);

  // Load YouTube IFrame API
  useEffect(() => {
    const yt = (window as any).YT;
    if (yt && yt.Player) {
      setYtApiReady(true);
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    (window as any).onYouTubeIframeAPIReady = () => {
      setYtApiReady(true);
    };
  }, []);

  // Handle shared track from URL
  useEffect(() => {
    if (!ytApiReady) return;
    
    const params = new URLSearchParams(window.location.search);
    const playId = params.get('play');
    const title = params.get('title');
    const channel = params.get('channel');
    const thumbnail = params.get('thumbnail');

    if (playId && title && channel && thumbnail) {
      const track: Track = {
        id: playId,
        title: decodeURIComponent(title),
        channel: decodeURIComponent(channel),
        thumbnail: decodeURIComponent(thumbnail),
      };
      
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        handlePlayTrack(track);
        toast.success(`Playing shared track: ${track.title}`);
        
        // Clean up URL without refreshing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [ytApiReady, handlePlayTrack]);

  const fetchAudioUrl = useCallback(async (videoId: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-audio-url?videoId=${videoId}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      const data = await response.json();
      if (data.fallback || data.error || !data.audioUrl) return null;
      return data.audioUrl;
    } catch {
      return null;
    }
  }, []);

  const createPlayer = useCallback((videoId: string) => {
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch {}
      ytPlayerRef.current = null;
    }
    const container = document.getElementById('youtube-player-container');
    if (!container) return;
    container.innerHTML = '<div id="yt-player"></div>';

    const yt = (window as any).YT;
    if (!yt?.Player) return;

    ytPlayerRef.current = new yt.Player('yt-player', {
      height: '1', width: '1', videoId,
      playerVars: {
        autoplay: 1, controls: 0, disablekb: 1, fs: 0,
        iv_load_policy: 3, modestbranding: 1, rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: (e: any) => { e.target.setVolume(80); e.target.playVideo(); },
        onStateChange: (e: any) => {
          // Only update isPlaying from YT events if YT is the active source
          if (activeSourceRef.current === 'background') return;
          if (e.data === yt.PlayerState.PLAYING) setIsPlaying(true);
          else if (e.data === yt.PlayerState.PAUSED) setIsPlaying(false);
          else if (e.data === yt.PlayerState.ENDED) {
            if (settings.autoPlayNext && handleNextRef.current) handleNextRef.current();
            else setIsPlaying(false);
          }
        },
        onError: () => {
          toast.error('Could not play this track. Trying next...');
          if (settings.autoPlayNext && handleNextRef.current) {
            setTimeout(() => handleNextRef.current?.(), 1000);
          }
        },
      },
    });
  }, [settings.autoPlayNext]);

  const playWithBackgroundAudio = useCallback(async (videoId: string) => {
    // Reset active source - YT starts first
    activeSourceRef.current = 'youtube';
    
    // Stop any existing background audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const yt = (window as any).YT;
    if (ytApiReady && yt?.Player) {
      createPlayer(videoId);
    } else {
      toast.error('Player not ready. Please try again.');
      return;
    }

    // Fetch background audio URL in parallel, switch if available
    if (useBackgroundAudioMode) {
      fetchAudioUrl(videoId).then((audioUrl) => {
        if (audioUrl && audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();
          
          // Sync position from YT player before switching
          let ytCurrentTime = 0;
          if (ytPlayerRef.current) {
            try { ytCurrentTime = ytPlayerRef.current.getCurrentTime?.() || 0; } catch {}
          }
          
          audioRef.current.currentTime = ytCurrentTime;
          audioRef.current.play()
            .then(() => {
              // Mark background as active BEFORE pausing YT
              activeSourceRef.current = 'background';
              setIsPlaying(true);
              if (ytPlayerRef.current) {
                try { ytPlayerRef.current.pauseVideo(); } catch {}
              }
            })
            .catch(() => {
              setUseBackgroundAudioMode(false);
            });
        }
      });
    }
  }, [useBackgroundAudioMode, fetchAudioUrl, ytApiReady, createPlayer]);

  const handlePlayTrack = useCallback((track: Track, trackList?: Track[]) => {
    if (trackList) {
      setTracks(trackList);
      const idx = trackList.findIndex(t => t.id === track.id);
      setCurrentTrackIndex(idx);
    } else {
      const idx = tracks.findIndex(t => t.id === track.id);
      setCurrentTrackIndex(idx);
    }
    setCurrentTrack(track);
    setPlayingFromPlaylist(false);
    setLastPlayed(track.id);
    setShowMiniPlayer(true);
    recordPlay(track);
    playWithBackgroundAudio(track.id);
  }, [tracks, playWithBackgroundAudio, setLastPlayed, recordPlay]);

  const handlePlayFromPlaylist = useCallback((track: Track) => {
    setCurrentTrack(track);
    setPlayingFromPlaylist(true);
    setLastPlayed(track.id);
    setShowMiniPlayer(true);
    recordPlay(track);
    playWithBackgroundAudio(track.id);
  }, [playWithBackgroundAudio, setLastPlayed, recordPlay]);

  const handlePlayPause = useCallback(() => {
    // Use active source to determine which player to control
    if (activeSourceRef.current === 'background' && audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }
    if (!ytPlayerRef.current) return;
    try {
      if (isPlaying) { ytPlayerRef.current.pauseVideo(); setIsPlaying(false); }
      else { ytPlayerRef.current.playVideo(); setIsPlaying(true); }
    } catch {}
  }, [isPlaying]);

  const cycleLoopMode = useCallback(() => {
    setLoopMode(prev => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      localStorage.setItem('nyra-loop-mode', next);
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    // Loop One: replay the same track
    if (loopMode === 'one' && currentTrack) {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } else if (ytPlayerRef.current) {
        try { ytPlayerRef.current.seekTo(0); ytPlayerRef.current.playVideo(); } catch {}
      }
      setIsPlaying(true);
      return;
    }

    const nextFromQueue = getNextFromQueue(playlist);
    if (nextFromQueue) {
      setCurrentTrack(nextFromQueue);
      setPlayingFromPlaylist(false);
      setLastPlayed(nextFromQueue.id);
      playWithBackgroundAudio(nextFromQueue.id);
      return;
    }
    if (playingFromPlaylist && currentTrack) {
      const nextTrack = getNextTrack(currentTrack.id);
      if (nextTrack) {
        setCurrentTrack(nextTrack);
        setLastPlayed(nextTrack.id);
        playWithBackgroundAudio(nextTrack.id);
        return;
      } else if (loopMode === 'all' && playlist.length > 0) {
        // Loop All: go back to first track in playlist
        const firstTrack = playlist[0];
        setCurrentTrack(firstTrack);
        setLastPlayed(firstTrack.id);
        playWithBackgroundAudio(firstTrack.id);
        return;
      } else { setIsPlaying(false); toast.info('Playlist ended'); return; }
    }
    if (tracks.length === 0) return;
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex >= tracks.length) {
      if (loopMode === 'all') {
        const firstTrack = tracks[0];
        setCurrentTrack(firstTrack);
        setCurrentTrackIndex(0);
        setLastPlayed(firstTrack.id);
        playWithBackgroundAudio(firstTrack.id);
        return;
      }
      setIsPlaying(false); toast.info('End of tracks'); return;
    }
    const nextTrack = tracks[nextIndex];
    setCurrentTrack(nextTrack);
    setCurrentTrackIndex(nextIndex);
    setPlayingFromPlaylist(false);
    setLastPlayed(nextTrack.id);
    playWithBackgroundAudio(nextTrack.id);
  }, [currentTrackIndex, tracks, playWithBackgroundAudio, playingFromPlaylist, currentTrack, getNextTrack, getNextFromQueue, playlist, setLastPlayed, loopMode, audioRef, ytPlayerRef]);

  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  const handlePrevious = useCallback(() => {
    if (playingFromPlaylist && currentTrack) {
      const prevTrack = getPreviousTrack(currentTrack.id);
      if (prevTrack) {
        setCurrentTrack(prevTrack);
        setLastPlayed(prevTrack.id);
        playWithBackgroundAudio(prevTrack.id);
        return;
      }
    }
    if (tracks.length === 0) return;
    const prevIndex = currentTrackIndex <= 0 ? tracks.length - 1 : currentTrackIndex - 1;
    const prevTrack = tracks[prevIndex];
    setCurrentTrack(prevTrack);
    setCurrentTrackIndex(prevIndex);
    setPlayingFromPlaylist(false);
    setLastPlayed(prevTrack.id);
    playWithBackgroundAudio(prevTrack.id);
  }, [currentTrackIndex, tracks, playWithBackgroundAudio, playingFromPlaylist, currentTrack, getPreviousTrack, setLastPlayed]);

  const handleAddToPlaylist = useCallback((track: Track) => {
    if (isInPlaylist(track.id)) { toast.info('Track already in playlist'); return; }
    addToPlaylist(track);
    toast.success('Added to playlist');
  }, [addToPlaylist, isInPlaylist]);

  const handleAddToQueue = useCallback((track: Track) => {
    addToQueue(track);
  }, [addToQueue]);

  const handleRemoveFromPlaylist = useCallback((trackId: string) => {
    removeFromPlaylist(trackId);
    toast.success('Removed from playlist');
  }, [removeFromPlaylist]);

  const handleClearPlaylist = useCallback(() => {
    clearPlaylist();
    clearQueue();
    toast.success('Playlist and queue cleared');
  }, [clearPlaylist, clearQueue]);

  const handlePlayFromQueue = useCallback((track: Track) => {
    removeFromQueue(track.id);
    setCurrentTrack(track);
    setPlayingFromPlaylist(false);
    setLastPlayed(track.id);
    playWithBackgroundAudio(track.id);
  }, [removeFromQueue, setLastPlayed, playWithBackgroundAudio]);

  // Media Session API
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.channel,
      album: 'NYRA Music',
      artwork: [
        { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => { audioRef.current?.play()?.catch(() => {}); ytPlayerRef.current?.playVideo?.(); }],
      ['pause', () => { audioRef.current?.pause(); ytPlayerRef.current?.pauseVideo?.(); }],
      ['previoustrack', handlePrevious],
      ['nexttrack', handleNext],
    ];
    for (const [action, handler] of handlers) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
    }
    return () => {
      for (const [action] of handlers) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, [handleNext, handlePrevious]);

  // Animate browser tab with track info + soundwave
  useTabTitle(currentTrack?.title || null, isPlaying);

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack, isPlaying, useBackgroundAudioMode,
      ytPlayerRef, audioRef,
      handlePlayTrack, handlePlayPause, handleNext, handlePrevious,
      handlePlayFromPlaylist, handlePlayFromQueue,
      handleAddToPlaylist, handleAddToQueue,
      handleRemoveFromPlaylist, handleClearPlaylist,
      playlist, queue, isInPlaylist, removeFromQueue, reorderPlaylist,
      shuffleMode, toggleShuffle,
      loopMode, cycleLoopMode,
      isFavorite, toggleFavorite,
      tracks, setTracks,
      showMiniPlayer, setShowMiniPlayer,
    }}>
      {children}
      {/* Hidden YouTube Player Container - persists across routes */}
      <div
        id="youtube-player-container"
        className="fixed -top-[1px] left-0 w-1 h-[1px] opacity-0 pointer-events-none overflow-hidden"
      />
    </MusicPlayerContext.Provider>
  );
}
