import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Trash2, Shuffle, Repeat, Repeat1, ArrowLeft, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useDropDetector } from '@/hooks/useDropDetector';
import { useSongPowerLevels } from '@/hooks/useSongPowerLevels';
import { useEnergyTheme } from '@/hooks/useEnergyTheme';
import { useThemeProfile } from '@/hooks/useThemeProfile';
import { useMusicMemory } from '@/hooks/useMusicMemory';
import DropEffect from '@/components/DropEffect';
import EnergyMeter from '@/components/EnergyMeter';
import SongPowerSliders from '@/components/SongPowerSliders';
import DropTimestampManager from '@/components/DropTimestampManager';
import ThemeProfileSelector from '@/components/ThemeProfileSelector';
import { cn } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import MusicPlayer from '@/components/MusicPlayer';
import Sidebar from '@/components/Sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface PlaylistItem {
  id: string;
  track_id: string;
  track_title: string;
  track_thumbnail: string;
  track_channel: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
}

const PlaylistView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useTheme();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);
  const [activeTab, setActiveTab] = useState('playlists');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [loopMode, setLoopMode] = useState<'off' | 'all' | 'one'>('off');
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  
  const ytPlayerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleNextRef = useRef<() => void>();
  const [useBackgroundAudio, setUseBackgroundAudio] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Effects hooks
  const { getLevels, setLevels } = useSongPowerLevels();
  const { dropActive, addDrop, removeDrop, getDrops } = useDropDetector(currentTrack?.id, playbackTime);
  const currentMood = useEnergyTheme(currentTrack?.title, settings.energyThemeEnabled);
  const { profile, setProfile } = useThemeProfile();
  const { recordPlay: recordMemory } = useMusicMemory();

  // Track playback time for drop detector
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current && audioRef.current.src && !isNaN(audioRef.current.currentTime)) {
        setPlaybackTime(audioRef.current.currentTime);
      } else if (ytPlayerRef.current?.getCurrentTime) {
        try { setPlaybackTime(ytPlayerRef.current.getCurrentTime()); } catch {}
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentPowerLevels = currentTrack ? getLevels(currentTrack.id) : { hype: 50, chill: 50, aggression: 30 };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user && id) {
      fetchPlaylist();
    }
  }, [user, authLoading, id, navigate]);

  // Create background audio element (best-effort for mobile minimize/lock-screen)
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

  // Audio events: ended => autoplay next, error => fallback to YouTube
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (handleNextRef.current) {
        handleNextRef.current();
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      console.error('Audio error, falling back to YouTube player');
      setUseBackgroundAudio(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setYtApiReady(true);
    };
  }, []);

  const fetchPlaylist = async () => {
    try {
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', id)
        .single();

      if (playlistError) throw playlistError;
      setPlaylist(playlistData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select('*')
        .eq('playlist_id', id)
        .order('position', { ascending: true });

      if (itemsError) throw itemsError;

      const playlistTracks = itemsData?.map((item: PlaylistItem) => ({
        id: item.track_id,
        title: item.track_title,
        thumbnail: item.track_thumbnail,
        channel: item.track_channel,
      })) || [];

      setTracks(playlistTracks);
    } catch (error: any) {
      toast.error('Failed to load playlist');
      navigate('/playlists');
    } finally {
      setLoading(false);
    }
  };

  const createPlayer = useCallback((videoId: string) => {
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch (e) {
        console.log('Player destroy error:', e);
      }
      ytPlayerRef.current = null;
    }

    const container = document.getElementById('youtube-player-container');
    if (!container) return;
    
    container.innerHTML = '<div id="yt-player"></div>';

    ytPlayerRef.current = new window.YT.Player('yt-player', {
      height: '1',
      width: '1',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(80);
          event.target.playVideo();
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (event.data === window.YT.PlayerState.ENDED) {
            // Always autoplay next in playlist
            if (handleNextRef.current) {
              handleNextRef.current();
            } else {
              setIsPlaying(false);
            }
          }
        },
        onError: (event: any) => {
          toast.error('Could not play this track. Trying next...');
          setTimeout(() => handleNextRef.current?.(), 1000);
        },
      },
    });
  }, []);

  // Fetch audio URL for background playback
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
    } catch (error) {
      console.error('Failed to fetch audio URL:', error);
      return null;
    }
  }, []);

  // Play track with background audio support (fallback to YouTube if unavailable)
  const playWithBackgroundAudio = useCallback(async (videoId: string) => {
    // If background audio is disabled/failing, use YouTube directly
    if (!useBackgroundAudio) {
      if (ytApiReady && window.YT && window.YT.Player) {
        createPlayer(videoId);
      }
      return;
    }

    const audioUrl = await fetchAudioUrl(videoId);

    if (audioUrl && audioRef.current) {
      // Stop YouTube player if running
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (_) {}
      }

      audioRef.current.src = audioUrl;
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((error) => {
          console.error('Background audio failed:', error);
          setUseBackgroundAudio(false);
          if (ytApiReady && window.YT && window.YT.Player) {
            createPlayer(videoId);
          }
        });

      return;
    }

    // No audio URL => fallback to YouTube
    setUseBackgroundAudio(false);
    if (ytApiReady && window.YT && window.YT.Player) {
      createPlayer(videoId);
    }
  }, [useBackgroundAudio, fetchAudioUrl, ytApiReady, createPlayer]);

  useEffect(() => {
    // Only create the YouTube player when we're not using background audio
    if (ytApiReady && currentTrack && !useBackgroundAudio) {
      createPlayer(currentTrack.id);
    }
  }, [ytApiReady, currentTrack, createPlayer, useBackgroundAudio]);

  const handlePlayTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    recordMemory(track);
    playWithBackgroundAudio(track.id);
  }, [playWithBackgroundAudio, recordMemory]);

  const handlePlayPause = useCallback(() => {
    // Prefer background audio when available
    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
          setUseBackgroundAudio(false);
          if (currentTrack) createPlayer(currentTrack.id);
        });
      }
      return;
    }

    // Fallback to YouTube player
    if (ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    }
  }, [isPlaying, currentTrack, createPlayer]);

  const handleNext = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;

    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    let nextIndex: number;

    if (loopMode === 'one') {
      // Restart current track
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(0);
        ytPlayerRef.current.playVideo();
      }
      return;
    } else if (loopMode === 'all') {
      nextIndex = (currentIndex + 1) % tracks.length;
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= tracks.length) {
        setIsPlaying(false);
        toast.info('Playlist ended');
        return;
      }
    }

    const nextTrack = tracks[nextIndex];
    setCurrentTrack(nextTrack);
    setIsPlaying(true);
    playWithBackgroundAudio(nextTrack.id);
  }, [currentTrack, tracks, loopMode, playWithBackgroundAudio]);

  // Keep ref updated to avoid stale closure in createPlayer
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handlePrevious = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
    const prevTrack = tracks[prevIndex];
    setCurrentTrack(prevTrack);
    setIsPlaying(true);
    playWithBackgroundAudio(prevTrack.id);
  }, [currentTrack, tracks, playWithBackgroundAudio]);

  // Media Session (lock screen controls)
  const handleMediaPlay = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (ytPlayerRef.current) {
      ytPlayerRef.current.playVideo();
    }
  }, []);

  const handleMediaPause = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    }
  }, []);

  useMediaSession({
    currentTrack,
    isPlaying,
    onPlay: handleMediaPlay,
    onPause: handleMediaPause,
    onNext: handleNext,
    onPrevious: handlePrevious,
    audioRef,
  });

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_items')
        .delete()
        .eq('playlist_id', id)
        .eq('track_id', trackId);

      if (error) throw error;

      toast.success('Track removed');
      fetchPlaylist();
    } catch (error: any) {
      toast.error('Failed to remove track');
    }
  };

  const handlePlaylistSearch = async () => {
    if (!playlistSearchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search?q=${encodeURIComponent(playlistSearchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const results = await response.json();
      if (results.error) throw new Error(results.error);

      setSearchResults(results);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToPlaylist = async (track: Track) => {
    try {
      // Check if already exists
      const exists = tracks.some(t => t.id === track.id);
      if (exists) {
        toast.info('Track already in playlist');
        return;
      }

      const nextPosition = tracks.length;

      const { error } = await supabase.from('playlist_items').insert({
        playlist_id: id,
        track_id: track.id,
        track_title: track.title,
        track_thumbnail: track.thumbnail,
        track_channel: track.channel,
        position: nextPosition,
      });

      if (error) throw error;

      toast.success('Added to playlist!');
      fetchPlaylist();
      setSearchResults([]);
      setPlaylistSearchQuery('');
    } catch (error: any) {
      toast.error('Failed to add track');
    }
  };

  const getLoopIcon = () => {
    switch (loopMode) {
      case 'one':
        return <Repeat1 className="w-5 h-5" />;
      case 'all':
        return <Repeat className="w-5 h-5" />;
      default:
        return <Repeat className="w-5 h-5" />;
    }
  };

  const cycleLoopMode = () => {
    setLoopMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const reorderedTracks = [...tracks];
    const [removed] = reorderedTracks.splice(draggedIndex, 1);
    reorderedTracks.splice(dropIndex, 0, removed);
    setTracks(reorderedTracks);
    setDraggedIndex(null);

    // Update positions in database
    try {
      for (let i = 0; i < reorderedTracks.length; i++) {
        await supabase
          .from('playlist_items')
          .update({ position: i })
          .eq('playlist_id', id)
          .eq('track_id', reorderedTracks[i].id);
      }
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    e.stopPropagation();
    setTouchStartY(e.touches[0].clientY);
    setTouchDragIndex(index);
    setDraggedIndex(index);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchDragIndex === null || touchStartY === null) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    const itemHeight = 80;
    const moveCount = Math.round(diff / itemHeight);
    
    if (moveCount !== 0) {
      const newIndex = Math.max(0, Math.min(tracks.length - 1, touchDragIndex + moveCount));
      if (newIndex !== touchDragIndex) {
        const reorderedTracks = [...tracks];
        const [removed] = reorderedTracks.splice(touchDragIndex, 1);
        reorderedTracks.splice(newIndex, 0, removed);
        setTracks(reorderedTracks);
        setTouchDragIndex(newIndex);
        setTouchStartY(currentY);
      }
    }
  }, [touchDragIndex, touchStartY, tracks]);

  const handleTouchEnd = async () => {
    if (touchDragIndex !== null) {
      // Update positions in database
      try {
        for (let i = 0; i < tracks.length; i++) {
          await supabase
            .from('playlist_items')
            .update({ position: i })
            .eq('playlist_id', id)
            .eq('track_id', tracks[i].id);
        }
      } catch (error) {
        console.error('Failed to save order:', error);
      }
    }
    setTouchStartY(null);
    setTouchDragIndex(null);
    setDraggedIndex(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-background/80 flex flex-col transition-all duration-500",
      settings.powerLevelsEnabled && currentPowerLevels.hype > 80 && isPlaying && "power-hype",
      settings.powerLevelsEnabled && currentPowerLevels.chill > 80 && isPlaying && "power-chill",
      settings.powerLevelsEnabled && currentPowerLevels.aggression > 80 && isPlaying && "power-aggression",
    )}>
      {settings.dropDetectorEnabled && <DropEffect active={dropActive} />}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <Navbar
        searchQuery={navSearchQuery}
        onSearchChange={setNavSearchQuery}
        onSearch={() => navigate('/')}
      />
      
      <main className="flex-1 md:ml-64 pt-20 pb-36 px-4 md:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/playlists')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Playlists
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold neon-text mb-2">{playlist?.name}</h1>
              {playlist?.description && (
                <p className="text-muted-foreground mb-2">{playlist.description}</p>
              )}
              <p className="text-muted-foreground">{tracks.length} tracks</p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShuffleMode(!shuffleMode)}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  shuffleMode
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              
              <button
                onClick={cycleLoopMode}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  loopMode !== 'off'
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title={`Loop: ${loopMode}`}
              >
                {getLoopIcon()}
              </button>
            </div>
          </div>
        </div>

        {/* Search within playlist page */}
        <div className="mb-6 p-4 bg-card rounded-xl border border-border">
          <h3 className="text-lg font-semibold mb-3 text-foreground">Add Songs to Playlist</h3>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search YouTube for songs..."
                value={playlistSearchQuery}
                onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePlaylistSearch()}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Button onClick={handlePlaylistSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <ScrollArea className="mt-4 max-h-60">
              <div className="space-y-2">
                {searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.channel}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddToPlaylist(track)}
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Effects Panel - shown when track is playing */}
        {currentTrack && (settings.dropDetectorEnabled || settings.powerLevelsEnabled || settings.energyMeterEnabled || settings.themeProfileEnabled) && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-up">
            {(settings.energyMeterEnabled || settings.powerLevelsEnabled) && (
              <div className="rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm p-4 space-y-3 glass-enhanced">
                {settings.energyMeterEnabled && <EnergyMeter levels={currentPowerLevels} isPlaying={isPlaying} />}
                {settings.powerLevelsEnabled && (
                  <SongPowerSliders
                    levels={currentPowerLevels}
                    onChange={(partial) => setLevels(currentTrack.id, partial)}
                  />
                )}
              </div>
            )}
            {settings.dropDetectorEnabled && (
              <div className="rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm p-4 glass-enhanced">
                <DropTimestampManager
                  trackId={currentTrack.id}
                  drops={getDrops(currentTrack.id)}
                  onAddDrop={addDrop}
                  onRemoveDrop={removeDrop}
                />
              </div>
            )}
            {settings.themeProfileEnabled && (
              <div className="rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm p-4 glass-enhanced">
                <ThemeProfileSelector current={profile} onChange={setProfile} />
                {settings.energyThemeEnabled && currentMood && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    🎭 Auto-detected mood: <span className="text-primary font-medium">{currentMood}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Playlist Tracks */}
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Play className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-medium">This playlist is empty</p>
            <p className="text-sm">Use the search above to add songs</p>
          </div>
        ) : (
          <div className="h-[calc(100vh-500px)] min-h-64 overflow-y-auto pr-2">
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div
                  key={track.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => setDraggedIndex(null)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={cn(
                    'w-full flex items-center gap-2 md:gap-4 p-2 md:p-4 rounded-xl transition-all group',
                    currentTrack?.id === track.id
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-card hover:bg-card/80 border border-transparent',
                    draggedIndex === index && 'opacity-50 scale-[0.98]'
                  )}
                >
                  {/* Drag Handle - compact on mobile */}
                  <div
                    className="cursor-grab active:cursor-grabbing touch-manipulation flex-shrink-0 bg-primary/20 hover:bg-primary/40 rounded p-1 md:p-3 transition-all border border-primary/50"
                    onTouchStart={(e) => handleTouchStart(index, e)}
                  >
                    <div className="flex flex-col gap-0.5 w-2 md:w-5">
                      <div className="h-0.5 w-full bg-primary rounded-full"></div>
                      <div className="h-0.5 w-full bg-primary rounded-full"></div>
                      <div className="h-0.5 w-full bg-primary rounded-full"></div>
                    </div>
                  </div>

                  {/* Thumbnail + Play (always visible on mobile) */}
                  <div className="relative shrink-0">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-10 h-10 md:w-16 md:h-16 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <button
                      onClick={() => {
                        if (currentTrack?.id === track.id) {
                          handlePlayPause();
                        } else {
                          handlePlayTrack(track);
                        }
                      }}
                      aria-label={currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'}
                      className="absolute -bottom-1 -right-1 w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center neon-glow active:scale-95 touch-manipulation"
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
                      ) : (
                        <Play className="w-4 h-4 md:w-5 md:h-5 ml-0.5" fill="currentColor" />
                      )}
                    </button>
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p
                      className={cn(
                        'font-semibold truncate text-xs md:text-lg',
                        currentTrack?.id === track.id ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {track.title}
                    </p>
                    <p className="text-[10px] md:text-sm text-muted-foreground truncate">{track.channel}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                      onClick={() => handleRemoveTrack(track.id)}
                      aria-label="Remove from playlist"
                      className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors active:scale-95"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {currentTrack && (
        <MusicPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          playlist={tracks}
          onPlayFromPlaylist={handlePlayTrack}
          onRemoveFromPlaylist={handleRemoveTrack}
          onClearPlaylist={() => {}}
          ytPlayerRef={ytPlayerRef}
          audioRef={audioRef}
        />
      )}
    </div>
  );
};

export default PlaylistView;
