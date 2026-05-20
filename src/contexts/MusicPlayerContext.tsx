import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { notifyNativeTrack, notifyNativePlayback, listenCarCommands } from '@/lib/nyraMediaBridge';
import { toast } from 'sonner';
import { usePlaylist } from '@/hooks/usePlaylist';
import { useQueue } from '@/hooks/useQueue';
import { useFavorites } from '@/hooks/useFavorites';
import { useListeningHistory } from '@/hooks/useListeningHistory';
import { useTheme } from '@/contexts/ThemeContext';
import { useTabTitle } from '@/hooks/useTabTitle';

const getAudioUrlEndpoint = (videoId: string, options?: { stream?: boolean; download?: boolean; title?: string }) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const baseUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/get-audio-url` : '/api/get-audio-url';
  const params = new URLSearchParams({ videoId });
  if (options?.stream) params.append('stream', '1');
  if (options?.download) params.append('download', '1');
  if (options?.title) params.append('title', options.title);
  return `${baseUrl}?${params.toString()}`;
};

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
  activeSource: 'youtube' | 'background' | null;

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
  forceBackgroundPlayback: (track?: Track, options?: { trackList?: Track[]; fromPlaylist?: boolean }) => Promise<boolean>;
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

  // Panel state
  nowPlayingOpen: boolean;
  setNowPlayingOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Mini player visibility
  showMiniPlayer: boolean;
  setShowMiniPlayer: React.Dispatch<React.SetStateAction<boolean>>;

  // Volume state
  volume: number;
  setVolume: (value: number) => void;
  isMuted: boolean;
  setIsMuted: (value: boolean) => void;
  useBackgroundAudioOnly: boolean;
  setUseBackgroundAudioOnly: (v: boolean) => void;
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
  const [useBackgroundAudioOnly, setUseBackgroundAudioOnly] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [loopMode, setLoopMode] = useState<'off' | 'all' | 'one'>(() => {
    return (localStorage.getItem('nyra-loop-mode') as 'off' | 'all' | 'one') || 'off';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('nyra-volume');
    return saved ? parseInt(saved, 10) : 80;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('nyra-muted') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('nyra-volume', volume.toString());
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
    if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
      ytPlayerRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted]);

  useEffect(() => {
    localStorage.setItem('nyra-muted', isMuted.toString());
  }, [isMuted]);




  // Track which audio source is active to prevent state conflicts
  const activeSourceRef = useRef<'youtube' | 'background' | null>(null);
  const [activeSource, setActiveSource] = useState<'youtube' | 'background' | null>(null);

  const ytPlayerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleNextRef = useRef<() => void>();

  const setPlaybackSource = useCallback((source: 'youtube' | 'background' | null) => {
    activeSourceRef.current = source;
    setActiveSource(source);
  }, []);

  const safePlay = useCallback(async (audio: HTMLAudioElement) => {
    try {
      await audio.play();
      setIsPlaying(true);
      return true;
    } catch (e: any) {
      if (!useBackgroundAudioOnly && (e.name === 'NotSupportedError' || e.message?.includes('suitable') || e.message?.includes('CORS'))) {
        console.warn('CORS/Suitability failure, retrying without crossOrigin');
        audio.removeAttribute('crossOrigin');
        audio.load();
        try {
          await audio.play();
          setIsPlaying(true);
          return true;
        } catch (innerError) {
          console.error('Non-CORS fallback also failed:', innerError);
        }
      }
      return false;
    }
  }, [useBackgroundAudioOnly]);

  const {
    playlist, addToPlaylist, removeFromPlaylist, clearPlaylist,
    isInPlaylist, getNextTrack, getPreviousTrack, reorderPlaylist,
  } = usePlaylist();

  const {
    queue, addToQueue, removeFromQueue, clearQueue,
    getNextFromQueue, shuffleMode, toggleShuffle, setLastPlayed,
  } = useQueue();

  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  const { isFavorite, toggleFavorite } = useFavorites();
  const { recordPlay } = useListeningHistory();

    // Create background audio element on mount
    useEffect(() => {
      if (!audioRef.current) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous'; // Critical for Web Audio API
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


    // Sync loop mode with audio element
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.loop = loopMode === 'one';
      }
    }, [loopMode]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (loopMode === 'one') {
        // Native loop handles it, but just in case
        return;
      }
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
    // Stop any existing background audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // Race a direct audio URL fetch against a fast timeout so playback starts
    // instantly via YouTube if the edge function is slow.
    // Race a direct audio URL fetch against a timeout.
    // Increased timeout for better reliability on slower connections.
    const START_TIMEOUT_MS = useBackgroundAudioOnly ? 20000 : 2500;
    let usedFallback = false;

    try {
      const controller = new AbortController();
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          if (!usedFallback && !useBackgroundAudioOnly) {
            usedFallback = true;
            console.log('Background audio timeout, using YT fallback');
            setPlaybackSource('youtube');
            const yt = (window as any).YT;
            if (ytApiReady && yt?.Player) {
              createPlayer(videoId);
            }
            controller.abort();
          }
          resolve(null);
        }, START_TIMEOUT_MS);
      });

      const fetchPromise = fetch(
        getAudioUrlEndpoint(videoId)
      ).then(async (response) => {
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error('Audio URL fetch failed:', response.status, errData);
          return null;
        }
        const data = await response.json();
        return data?.audioUrl || data?.audioUrl1 || null;
      }).catch((e) => {
        console.error('Audio URL fetch error:', e);
        return null;
      });

      const audioUrl = await Promise.race([fetchPromise, timeoutPromise]);

      if (usedFallback) return;

      if (audioUrl && audioRef.current) {
        setPlaybackSource('background');
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.pauseVideo(); } catch {}
        }
        // Force use of the CORS-compliant stream proxy
        const proxyStreamUrl = getAudioUrlEndpoint(videoId, { stream: true });
        audioRef.current.crossOrigin = 'anonymous';
        audioRef.current.src = proxyStreamUrl;
        audioRef.current.load();
        
        const success = await safePlay(audioRef.current);
        if (!success) {
          if (useBackgroundAudioOnly) {
            toast.error('DJ Audio failed to resume. Tap anywhere to continue.');
            return;
          }
          setPlaybackSource('youtube');
          const yt = (window as any).YT;
          if (ytApiReady && yt?.Player) {
            createPlayer(videoId);
          }
        }
        return;
      }
    } catch (error) {
      console.warn('Background audio flow failed:', error);
    }


    if (usedFallback || useBackgroundAudioOnly) return;
    // Final fallback to standard YouTube IFrame player
    setPlaybackSource('youtube');
    const yt = (window as any).YT;
    if (ytApiReady && yt?.Player) {
      createPlayer(videoId);
    } else {
      toast.error('Player not ready. Please try again.');
    }
  }, [ytApiReady, createPlayer, setPlaybackSource]);

  const forceBackgroundPlayback = useCallback(async (track = currentTrack, options?: { trackList?: Track[]; fromPlaylist?: boolean }): Promise<boolean> => {
    if (!track || !audioRef.current) {
      toast.error('Play or select a song first');
      return false;
    }

    try {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch {}
      }
      audioRef.current.pause();
      audioRef.current.src = '';
      setUseBackgroundAudioMode(true);

      const response = await fetch(
        getAudioUrlEndpoint(track.id)
      );
      const data = response.ok ? await response.json() : null;
      const audioUrl = data?.audioUrl;

      if (!audioUrl) {
        console.warn('No audio URL from API');
        if (useBackgroundAudioOnly) {
          toast.error('DJ Audio stream unavailable. Try another song.');
          return false;
        }
        // No URL found — fall back to YouTube IFrame player
        setPlaybackSource('youtube');
        if (ytApiReady) createPlayer(track.id);
        return false;
      }

      if (options?.trackList) {
        setTracks(options.trackList);
        setCurrentTrackIndex(options.trackList.findIndex(t => t.id === track.id));
      }

      setCurrentTrack(track);
      setPlayingFromPlaylist(!!options?.fromPlaylist);
      setLastPlayed(track.id);
      recordPlay(track);
      setShowMiniPlayer(true);
      setPlaybackSource('background');

      // IMPORTANT: Use the edge function as the audio proxy (&stream=1).
      // Direct Piped URLs are blocked by some ISPs (e.g. India).
      // The edge function runs from US/EU IPs that can reach Piped.
      // The browser makes range requests — each small chunk completes within timeouts.
      const streamUrl = getAudioUrlEndpoint(track.id, { stream: true });
      // IMPORTANT: Keep crossOrigin='anonymous' — required for Web Audio API (DJ effects)
      // Removing it would silently break the DJ engine even though audio still plays
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.src = streamUrl;
      audioRef.current.preload = 'auto';
      audioRef.current.load();

      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (playError: any) {
        if (playError?.name === 'NotAllowedError') {
          // Autoplay blocked — user must press play
          setIsPlaying(false);
          toast.info('DJ Mode ready. Press Play to start audio.');
        } else {
          console.warn('Stream proxy failed:', playError?.message);
          if (useBackgroundAudioOnly) {
            toast.error('DJ Audio stream failed. Retrying...');
            return false;
          }
          // Stream failed — fall back to YouTube IFrame player
          audioRef.current.src = '';
          setPlaybackSource('youtube');
          if (ytApiReady) createPlayer(track.id);
          toast.info('Playing via YouTube player.');
        }
      }

      return true;
    } catch (error: any) {
      console.warn('Force DJ source failed:', error);
      if (useBackgroundAudioOnly) {
        toast.error(`DJ Audio failed: ${error?.message || 'Network error'}`);
        return false;
      }
      setPlaybackSource('youtube');
      toast.error(`Could not start DJ audio: ${error?.message || 'Network error'}`);
      return false;
    }
  }, [currentTrack, setLastPlayed, recordPlay, setPlaybackSource, ytApiReady, createPlayer, useBackgroundAudioOnly]);

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
    if (activeSourceRef.current === 'background' && audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        safePlay(audioRef.current).then(success => {
          if (!success) {
            toast.error("Playback failed. Reconnecting...");
            // Switch to YouTube as last resort
            setPlaybackSource('youtube');
          }
        });
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
  }, [currentTrackIndex, tracks, playWithBackgroundAudio, playingFromPlaylist, currentTrack, getPreviousTrack, setLastPlayed, handleNext]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handleAddToPlaylist = useCallback((track: Track) => {
    if (isInPlaylist(track.id)) { toast.info('Track already in playlist'); return; }
    addToPlaylist(track);
    toast.success('Added to playlist');
  }, [addToPlaylist, isInPlaylist]);

  const handleAddToQueue = useCallback((track: Track) => {
    addToQueue(track);
    toast.success(`⌛ "${track.title.slice(0, 30)}..." added to queue`);
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

  // --- Android Auto Bridge ---
  useEffect(() => {
    if (!currentTrack) return;
    notifyNativeTrack(
      currentTrack.title,
      currentTrack.channel,
      currentTrack.thumbnail,
      (audioRef.current?.duration || 0) * 1000
    );
  }, [currentTrack]);

  useEffect(() => {
    notifyNativePlayback(isPlaying, (audioRef.current?.currentTime || 0) * 1000);
  }, [isPlaying]);

  useEffect(() => {
    const unsub = listenCarCommands(
      () => { audioRef.current?.play()?.catch(() => {}); ytPlayerRef.current?.playVideo?.(); },
      () => { audioRef.current?.pause(); ytPlayerRef.current?.pauseVideo?.(); },
      (ms) => {
        if (audioRef.current) audioRef.current.currentTime = ms / 1000;
        ytPlayerRef.current?.seekTo?.(ms / 1000, true);
      }
    );
    return unsub;
  }, []);

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
      ['seekto', (details) => {
        if (details.seekTime !== undefined) {
          if (audioRef.current) audioRef.current.currentTime = details.seekTime;
          ytPlayerRef.current?.seekTo(details.seekTime, true);
        }
      }],
      ['stop', () => {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        ytPlayerRef.current?.stopVideo?.();
      }],
    ];
    for (const [action, handler] of handlers) {
      try { navigator.mediaSession.setActionHandler(action as any, handler); } catch {}
    }
    return () => {
      for (const [action] of handlers) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, [handleNext, handlePrevious]);

  useTabTitle(currentTrack?.title || null, isPlaying);

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack, isPlaying, useBackgroundAudioMode, activeSource,
      ytPlayerRef, audioRef,
      handlePlayTrack, handlePlayPause, handleNext, handlePrevious,
      handlePlayFromPlaylist, handlePlayFromQueue,
      forceBackgroundPlayback,
      handleAddToPlaylist, handleAddToQueue,
      handleRemoveFromPlaylist, handleClearPlaylist,
      playlist, queue, isInPlaylist, removeFromQueue, reorderPlaylist,
      shuffleMode, toggleShuffle,
      loopMode, cycleLoopMode,
      nowPlayingOpen, setNowPlayingOpen,
      isFavorite, toggleFavorite,
      tracks, setTracks,
      showMiniPlayer, setShowMiniPlayer,
      volume, setVolume,
      isMuted, setIsMuted,
      useBackgroundAudioOnly, setUseBackgroundAudioOnly,
    }}>

      {children}
      <div
        id="youtube-player-container"
        className="fixed -top-[1px] left-0 w-1 h-[1px] opacity-0 pointer-events-none overflow-hidden"
      />
    </MusicPlayerContext.Provider>
  );
}
