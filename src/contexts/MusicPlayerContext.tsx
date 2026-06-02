import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { notifyNativeTrack, notifyNativePlayback, listenCarCommands } from '@/lib/nyraMediaBridge';
import { toast } from 'sonner';
import { usePlaylist } from '@/hooks/usePlaylist';
import { useQueue } from '@/hooks/useQueue';
import { useFavorites } from '@/hooks/useFavorites';
import { useListeningHistory } from '@/hooks/useListeningHistory';
import { useTheme } from '@/contexts/ThemeContext';
import { useTabTitle } from '@/hooks/useTabTitle';
import { useDjAudio } from '@/hooks/useDjAudio';

const getAudioUrlEndpoint = (videoId: string, options?: { stream?: boolean; download?: boolean; title?: string }) => {
  const baseUrl = '/api/get-audio-url';
  const params = new URLSearchParams({ videoId });
  if (options?.stream) params.append('stream', '1');
  if (options?.download) params.append('download', '1');
  if (options?.title) params.append('title', options.title);
  return `${baseUrl}?${params.toString()}`;
};

// Robust, high-speed client-side resolver that bypasses server proxies
const resolveAudioUrlOnClient = async (videoId: string): Promise<string | null> => {
  console.log(`[Client Resolver] Resolving backup audio stream for ${videoId}...`);
  
  const COBALT_INSTANCES = [
    'https://api.cobalt.tools',
    'https://cobalt.api.ryboflops.lol',
    'https://cobalt.k6.ovh',
    'https://cobalt.shite.xyz',
    'https://co.wuk.sh',
    'https://cobalt.smartit.nu',
    'https://cobalt.drgns.space',
    'https://c.onon.app',
    'https://co.v6.sh'
  ];
  
  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.private.coffee',
    'https://piped-api.lre.yt',
    'https://pipedapi.cl7.it',
    'https://piped-api.hostux.net',
    'https://pipedapi.adminforge.de',
    'https://api-piped.mha.fi',
    'https://pipedapi.swish.re',
    'https://pipedapi.spirit.com.de',
    'https://pipedapi.leptons.xyz',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.moomoo.me',
    'https://pipedapi.river.rocks'
  ];

  const shuffle = (array: string[]): string[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const getTimeoutSignal = (ms: number) => {
    try {
      return AbortSignal.timeout(ms);
    } catch {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    }
  };

  const safelyParseJson = async <T = any>(response: Response): Promise<T | null> => {
    try {
      const text = await response.text();
      if (!text || text.trim() === '') return null;
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  // Attempt 0: Prioritized proven high-performance Invidious Instance
  const prioritizedInvidious = [
    'https://inv.thepixora.com',
    'https://yewtu.be',
    'https://invidious.projectsegfau.lt'
  ];

  for (const inst of prioritizedInvidious) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        signal: getTimeoutSignal(4000)
      });
      if (res.ok) {
        const data = await safelyParseJson<any>(res);
        if (!data) continue;
        const formats = data?.adaptiveFormats || [];
        // Prioritize audio/mp4 for outstanding iOS, iPadOS and Safari compatibility, then fall back to any audio
        const format = formats.find((f: any) => f.type?.includes('audio/mp4')) ||
                       formats.find((f: any) => f.type?.startsWith('audio/'));
        if (format?.url) {
          try {
            const host = new URL(inst).host;
            const googleUrl = new URL(format.url);
            const proxyUrl = `https://${host}${googleUrl.pathname}${googleUrl.search}`;
            console.log(`[Client Resolver] Priority success using Invidious Instance from ${inst} with proxy:`, proxyUrl.substring(0, 100));
            return proxyUrl;
          } catch {
            console.log(`[Client Resolver] Priority success using Invidious Instance from ${inst} (raw fallback)`);
            return format.url;
          }
        }
      }
    } catch (e: any) {
      console.warn(`[Client Resolver] Priority Invidious inst ${inst} failed:`, e?.message);
    }
  }

  // Attempt 1: Dynamic Invidious Registry Fallback
  try {
    console.log('[Client Resolver] Fetching dynamic live Invidious registry...');
    const regRes = await fetch('https://api.invidious.io/instances.json', { signal: getTimeoutSignal(3500) });
    if (regRes.ok) {
      const data = await safelyParseJson<any>(regRes);
      if (data) {
        const upInstances = data
          .map((item: any) => ({
            domain: item[0],
            uri: item[1].uri || `https://${item[0]}`,
            down: item[1].monitor?.down,
            status: item[1].monitor?.last_status
          }))
          .filter((inst: any) => !inst.down && inst.status === 200 && !prioritizedInvidious.includes(inst.uri));

        const shuffledUp = shuffle(upInstances.map((x: any) => x.uri));
        for (const inst of shuffledUp.slice(0, 4)) {
          try {
            const res = await fetch(`${inst}/api/v1/videos/${videoId}`, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
              },
              signal: getTimeoutSignal(3500)
            });
            if (res.ok) {
              const detail = await safelyParseJson<any>(res);
              if (!detail) continue;
              const formats = detail?.adaptiveFormats || [];
              // Prioritize audio/mp4 for outstanding iOS, iPadOS and Safari compatibility, then fall back to any audio
              const format = formats.find((f: any) => f.type?.includes('audio/mp4')) ||
                             formats.find((f: any) => f.type?.startsWith('audio/'));
              if (format?.url) {
                try {
                  const host = new URL(inst).host;
                  const googleUrl = new URL(format.url);
                  const proxyUrl = `https://${host}${googleUrl.pathname}${googleUrl.search}`;
                  console.log(`[Client Resolver] Dynamic success using Invidious Instance from ${inst} with proxy:`, proxyUrl.substring(0, 100));
                  return proxyUrl;
                } catch {
                  console.log(`[Client Resolver] Dynamic success using Invidious Instance from ${inst} (raw fallback)`);
                  return format.url;
                }
              }
            }
          } catch (e: any) {
            console.warn(`[Client Resolver] Dynamic Invidious inst ${inst} failed:`, e?.message);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[Client Resolver] Dynamic registry fetch failed:', err.message);
  }

  // Attempt 2: Cobalt Instances (Extremely high quality MP3 streams, very fast)
  const shuffledCobalt = shuffle(COBALT_INSTANCES);
  for (const inst of shuffledCobalt.slice(0, 4)) {
    try {
      // Modern Cobalt v10 API formats prefer simplified audio options and error on old keys, legacy v7 formats want isAudioOnly
      let res = await fetch(`${inst}/api/json`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          downloadMode: 'audio',
          audioFormat: 'mp3',
          audioQuality: '128'
        }),
        signal: getTimeoutSignal(3500)
      });

      if (!res.ok) {
        // Fallback to legacy parameters
        res = await fetch(`${inst}/api/json`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            isAudioOnly: true,
            audioFormat: 'mp3',
            audioQuality: '128'
          }),
          signal: getTimeoutSignal(3500)
        });
      }

      if (res.ok) {
        const data = await safelyParseJson<any>(res);
        if (data?.url) {
          console.log(`[Client Resolver] Successfully resolved using Cobalt API from ${inst}`);
          return data.url;
        }
      }
    } catch (e: any) {
      console.warn(`[Client Resolver] Cobalt inst ${inst} failed:`, e?.message);
    }
  }

  // Attempt 3: Piped Instances (Shuffled race)
  const shuffledPiped = shuffle(PIPED_INSTANCES);
  for (const inst of shuffledPiped.slice(0, 5)) {
    try {
      const res = await fetch(`${inst}/streams/${videoId}`, {
        signal: getTimeoutSignal(3500),
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const data = await safelyParseJson<any>(res);
        if (!data) continue;
        const audioStreams = data.audioStreams || [];
        // Prioritize audio/mp4 for Outstanding iOS/Safari/macOS compatibility
        const best = audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4')) ||
                     audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) {
          console.log(`[Client Resolver] Successfully resolved using Piped Instance from ${inst}`);
          return best.url;
        }
      }
    } catch (e: any) {
      console.warn(`[Client Resolver] Piped inst ${inst} failed:`, e?.message);
    }
  }

  console.error('[Client Resolver] All client-side resolutions failed.');
  return null;
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
  setUseBackgroundAudioMode: (v: boolean) => void;
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
  const [useBackgroundAudioMode, setUseBackgroundAudioModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nyra-bg-audio-mode');
      // Default to true now as requested by the user, providing full DJ features (EQ, split channels, crossfading) via Web Audio API.
      return saved !== 'false';
    }
    return true;
  });

  const setUseBackgroundAudioMode = useCallback((val: boolean) => {
    setUseBackgroundAudioModeState(val);
    localStorage.setItem('nyra-bg-audio-mode', String(val));
    if (val) {
      toast.info('DJ Music Engine activated (direct cloud stream rendering with full Web Audio EQ & crossfade).');
    } else {
      toast.info('Standard Music Engine activated (hybrid background fallback player).');
    }
  }, []);

  const [useBackgroundAudioOnly, setUseBackgroundAudioOnlyState] = useState(false);
  const useBackgroundAudioOnlyRef = useRef(false);
  const isResolvingStreamRef = useRef(false);

  const setUseBackgroundAudioOnly = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setUseBackgroundAudioOnlyState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      useBackgroundAudioOnlyRef.current = next;
      return next;
    });
  }, []);

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

  const djAudio = useDjAudio(audioRef, isPlaying);

  const setPlaybackSource = useCallback((source: 'youtube' | 'background' | null) => {
    activeSourceRef.current = source;
    setActiveSource(source);
  }, []);

  const safePlay = useCallback(async (audio: HTMLAudioElement) => {
    try {
      await audio.play();
      setIsPlaying(true);
      try {
        djAudio.init();
      } catch (err) {
        console.warn('djAudio.init() in safePlay failed:', err);
      }
      return true;
    } catch (e: any) {
      if (!useBackgroundAudioOnlyRef.current && (e.name === 'NotSupportedError' || e.message?.includes('suitable') || e.message?.includes('CORS'))) {
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
  }, []);

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

    const handleError = (e: any) => {
      if (isResolvingStreamRef.current) {
        console.warn('Audio element error ignored during active background resolution/retry phase');
        return;
      }
      console.error('Audio error, falling back to YouTube player', e);
      if (!useBackgroundAudioOnlyRef.current) {
        setUseBackgroundAudioMode(false);
      } else {
        toast.error('DJ Stream playback interrupted. Reconnecting...');
      }
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
    if (activeSourceRef.current === 'background') {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.src = '';
    }

    const playDirectStream = async (url: string, crossOriginSetting: 'anonymous' | null) => {
      if (!audioRef.current) return false;
      try {
        if (crossOriginSetting) {
          audioRef.current.crossOrigin = crossOriginSetting;
        } else {
          audioRef.current.removeAttribute('crossOrigin');
        }
        audioRef.current.src = url;
        audioRef.current.preload = 'auto';
        audioRef.current.load();
        return await safePlay(audioRef.current);
      } catch (err) {
        console.warn('playDirectStream error:', err);
        return false;
      }
    };

    const tryRobustResolution = async (): Promise<boolean> => {
      isResolvingStreamRef.current = true;
      try {
        // 1. Try local/Supabase stream proxy
        console.log('Resolving stream via edge proxy...');
        const proxyStreamUrl = getAudioUrlEndpoint(videoId, { stream: true });
        let success = await playDirectStream(proxyStreamUrl, 'anonymous');
        if (success) {
          isResolvingStreamRef.current = false;
          return true;
        }

        // 2. Try direct audio URL from edge function
        try {
          console.log('Edge proxy failed. Querying direct url JSON...');
          const response = await fetch(getAudioUrlEndpoint(videoId));
          const data = response.ok ? await response.json() : null;
          const directAudioUrl = data?.audioUrl || data?.audioUrl1;
          if (directAudioUrl) {
            // Play with anonymous first to see if CORS is OK
            success = await playDirectStream(directAudioUrl, 'anonymous');
            if (success) {
              isResolvingStreamRef.current = false;
              return true;
            }

            // If CORS fails, raw playback is only useful outside DJ-only mode.
            if (!useBackgroundAudioOnlyRef.current) {
              success = await playDirectStream(directAudioUrl, null);
              if (success) {
                toast.warning('DJ effects disabled for this track (raw stream fallback).');
                isResolvingStreamRef.current = false;
                return true;
              }
            }
          }
        } catch (fallbackErr) {
          console.error('Edge direct json fetch failed:', fallbackErr);
        }

        // 3. Fallback to high-performance client-side resolver (Cobalt / Piped / Invidious)
        try {
          toast.info('Resolving direct high-speed cloud fallback stream...');
          const clientUrl = await resolveAudioUrlOnClient(videoId);
          if (clientUrl) {
            success = await playDirectStream(clientUrl, 'anonymous');
            if (success) {
              toast.success('DJ Stream connected directly!');
              isResolvingStreamRef.current = false;
              return true;
            }

            // Proxy the direct URL through our Express server to guarantee CORS compatibility!
            const proxiedUrl = `/api/get-audio-url?proxyUrl=${encodeURIComponent(clientUrl)}`;
            success = await playDirectStream(proxiedUrl, 'anonymous');
            if (success) {
              toast.success('DJ Stream connected via high-speed proxy!');
              isResolvingStreamRef.current = false;
              return true;
            }

            if (!useBackgroundAudioOnlyRef.current) {
              success = await playDirectStream(clientUrl, null);
              if (success) {
                toast.warning('DJ effects disabled for this track (CORS cloud fallback).');
                isResolvingStreamRef.current = false;
                return true;
              }
            }
          }
        } catch (clientErr) {
          console.error('Client resolver failed:', clientErr);
        }
      } finally {
        isResolvingStreamRef.current = false;
      }
      return false;
    };

    if (useBackgroundAudioOnlyRef.current) {
      setPlaybackSource('background');
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch {}
      }
      const resolved = await tryRobustResolution();
      if (!resolved) {
        toast.error('DJ Audio failed to load. Tap play to retry.');
      }
      return;
    }

    // Race a direct audio URL fetch against a fast timeout so playback starts
    // instantly via YouTube if the edge function is slow.
    const START_TIMEOUT_MS = 3500;
    let usedFallback = false;

    try {
      const controller = new AbortController();
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          if (!usedFallback && !useBackgroundAudioOnlyRef.current) {
            usedFallback = true;
            console.log('Background audio timeout, using YT fallback');
            setPlaybackSource('youtube');
            const yt = (window as any).YT;
            if (ytApiReady && yt?.Player) {
              createPlayer(videoId);
            }
            controller.abort();
          }
          resolve(false);
        }, START_TIMEOUT_MS);
      });

      const fetchResolutionPromise = tryRobustResolution();
      const result = await Promise.race([fetchResolutionPromise, timeoutPromise]);

      if (usedFallback) return;

      if (result === true) {
        setPlaybackSource('background');
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.pauseVideo(); } catch {}
        }
        return;
      }
    } catch (error) {
      console.warn('Background audio race failed:', error);
    }

    if (usedFallback || useBackgroundAudioOnlyRef.current) return;
    // Final fallback to standard YouTube IFrame player
    setPlaybackSource('youtube');
    const yt = (window as any).YT;
    if (ytApiReady && yt?.Player) {
      createPlayer(videoId);
    } else {
      toast.error('Player not ready. Please try again.');
    }
  }, [ytApiReady, createPlayer, setPlaybackSource, safePlay]);

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

      const playDirectStream = async (url: string, crossOriginSetting: 'anonymous' | null) => {
        if (!audioRef.current) return false;
        try {
          if (crossOriginSetting) {
            audioRef.current.crossOrigin = crossOriginSetting;
          } else {
            audioRef.current.removeAttribute('crossOrigin');
          }
          audioRef.current.src = url;
          audioRef.current.preload = 'auto';
          audioRef.current.load();
          await audioRef.current.play();
          setIsPlaying(true);
          try {
            djAudio.init();
          } catch (err) {
            console.warn('djAudio.init() in forceBackgroundPlayback failed:', err);
          }
          return true;
        } catch (err: any) {
          if (err?.name === 'NotAllowedError') {
            setIsPlaying(false);
            toast.info('DJ Mode ready. Press Play to start audio.');
            return true; // Autoplay blocked is not a "failure" of stream loading
          }
          console.warn('playDirectStream error:', err);
          return false;
        }
      };

      const tryRobustResolution = async (): Promise<boolean> => {
        isResolvingStreamRef.current = true;
        try {
          // 1. Try local/Supabase stream proxy
          console.log('Resolving force stream via edge proxy...');
          const streamUrl = getAudioUrlEndpoint(track.id, { stream: true });
          let success = await playDirectStream(streamUrl, 'anonymous');
          if (success) {
            isResolvingStreamRef.current = false;
            return true;
          }

          // 2. Try direct audio URL from edge function
          try {
            console.log('Edge proxy failed. Resolving direct url fallback...');
            const response = await fetch(getAudioUrlEndpoint(track.id));
            const data = response.ok ? await response.json() : null;
            const directAudioUrl = data?.audioUrl || data?.audioUrl1;
            if (directAudioUrl) {
              success = await playDirectStream(directAudioUrl, 'anonymous');
              if (success) {
                isResolvingStreamRef.current = false;
                return true;
              }

              if (!useBackgroundAudioOnlyRef.current) {
                success = await playDirectStream(directAudioUrl, null);
                if (success) {
                  toast.warning('DJ effects disabled for this track (raw stream fallback).');
                  isResolvingStreamRef.current = false;
                  return true;
                }
              }
            }
          } catch (fallbackErr: any) {
            console.error('Direct audio stream fallback failed:', fallbackErr);
          }

          // 3. Fallback to client-side resolver
          try {
            toast.info('Resolving direct high-speed cloud fallback stream...');
            const clientUrl = await resolveAudioUrlOnClient(track.id);
            if (clientUrl) {
              success = await playDirectStream(clientUrl, 'anonymous');
              if (success) {
                toast.success('DJ Stream connected directly!');
                isResolvingStreamRef.current = false;
                return true;
              }

              // Proxy the direct URL through our Express server to guarantee CORS compatibility!
              const proxiedUrl = `/api/get-audio-url?proxyUrl=${encodeURIComponent(clientUrl)}`;
              success = await playDirectStream(proxiedUrl, 'anonymous');
              if (success) {
                toast.success('DJ Stream connected via high-speed proxy!');
                isResolvingStreamRef.current = false;
                return true;
              }

              if (!useBackgroundAudioOnlyRef.current) {
                success = await playDirectStream(clientUrl, null);
                if (success) {
                  toast.warning('DJ effects disabled for this track (CORS cloud fallback).');
                  isResolvingStreamRef.current = false;
                  return true;
                }
              }
            }
          } catch (clientErr) {
            console.error('Client resolver failed:', clientErr);
          }
        } finally {
          isResolvingStreamRef.current = false;
        }
        return false;
      };

      const resolved = await tryRobustResolution();
      if (resolved) {
        return true;
      }

      if (useBackgroundAudioOnlyRef.current) {
        toast.error('DJ Audio stream failed. Try another song.');
        return false;
      }

      // Final fallback to standard YouTube IFrame player (only if not background only)
      audioRef.current.src = '';
      setPlaybackSource('youtube');
      if (ytApiReady) createPlayer(track.id);
      toast.info('Playing via YouTube player.');
      return true;

    } catch (error: any) {
      console.warn('Force DJ source failed:', error);
      if (useBackgroundAudioOnlyRef.current) {
        toast.error(`DJ Audio failed: ${error?.message || 'Network error'}`);
        return false;
      }
      setPlaybackSource('youtube');
      toast.error(`Could not start DJ audio: ${error?.message || 'Network error'}`);
      return false;
    }
  }, [currentTrack, setLastPlayed, recordPlay, setPlaybackSource, ytApiReady, createPlayer]);

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
    
    if (useBackgroundAudioOnlyRef.current || useBackgroundAudioMode) {
      playWithBackgroundAudio(track.id);
    } else {
      setPlaybackSource('youtube');
      if (ytApiReady) createPlayer(track.id);
    }
  }, [tracks, playWithBackgroundAudio, useBackgroundAudioMode, ytApiReady, createPlayer, setLastPlayed, recordPlay, setPlaybackSource]);

  const handlePlayFromPlaylist = useCallback((track: Track) => {
    setCurrentTrack(track);
    setPlayingFromPlaylist(true);
    setLastPlayed(track.id);
    setShowMiniPlayer(true);
    recordPlay(track);
    
    if (useBackgroundAudioOnlyRef.current || useBackgroundAudioMode) {
      playWithBackgroundAudio(track.id);
    } else {
      setPlaybackSource('youtube');
      if (ytApiReady) createPlayer(track.id);
    }
  }, [playWithBackgroundAudio, useBackgroundAudioMode, ytApiReady, createPlayer, setLastPlayed, recordPlay, setPlaybackSource]);

  const handlePlayPause = useCallback(() => {
    // If we have a track but no active source is playing it yet, start it up!
    if (currentTrack && (
      !activeSourceRef.current || 
      (useBackgroundAudioOnlyRef.current && activeSourceRef.current !== 'background') ||
      (activeSourceRef.current === 'background' && audioRef.current && !audioRef.current.src)
    )) {
      if (useBackgroundAudioOnlyRef.current) {
        playWithBackgroundAudio(currentTrack.id);
      } else {
        if (useBackgroundAudioMode) {
          playWithBackgroundAudio(currentTrack.id);
        } else {
          setPlaybackSource('youtube');
          if (ytApiReady) createPlayer(currentTrack.id);
        }
      }
      return;
    }

    if (activeSourceRef.current === 'background' && audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        safePlay(audioRef.current).then(success => {
          if (!success) {
            toast.error("Playback failed. Reconnecting...");
            // Switch to YouTube as last resort
            if (!useBackgroundAudioOnlyRef.current) {
              setPlaybackSource('youtube');
            }
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
  }, [isPlaying, currentTrack, useBackgroundAudioMode, playWithBackgroundAudio, ytApiReady, createPlayer, safePlay]);

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
      setUseBackgroundAudioMode,
    }}>

      {children}
      <div
        id="youtube-player-container"
        className="fixed -top-[1px] left-0 w-1 h-[1px] opacity-0 pointer-events-none overflow-hidden"
      />
    </MusicPlayerContext.Provider>
  );
}
