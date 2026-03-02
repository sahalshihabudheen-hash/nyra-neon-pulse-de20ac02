import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import TrackGrid from '@/components/TrackGrid';
import MusicPlayer from '@/components/MusicPlayer';
import TrendingSection from '@/components/TrendingSection';
import HeroSection from '@/components/HeroSection';
import PersonalizedSection from '@/components/PersonalizedSection';
import GenreOnboarding from '@/components/GenreOnboarding';
import DropEffect from '@/components/DropEffect';
import DropTimestampManager from '@/components/DropTimestampManager';
import SongPowerSliders from '@/components/SongPowerSliders';
import EnergyMeter from '@/components/EnergyMeter';
import ThemeProfileSelector from '@/components/ThemeProfileSelector';
import MusicMemoryPanel from '@/components/MusicMemoryPanel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePlaylist } from '@/hooks/usePlaylist';
import { useQueue } from '@/hooks/useQueue';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useListeningHistory } from '@/hooks/useListeningHistory';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useDropDetector } from '@/hooks/useDropDetector';
import { useSongPowerLevels } from '@/hooks/useSongPowerLevels';
import { useEnergyTheme } from '@/hooks/useEnergyTheme';
import { useThemeProfile } from '@/hooks/useThemeProfile';
import { useMusicMemory } from '@/hooks/useMusicMemory';
import { famousSongs } from '@/data/famousSongs';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);
  const [playingFromPlaylist, setPlayingFromPlaylist] = useState(false);
  const [useBackgroundAudio, setUseBackgroundAudio] = useState(true);
  const [playbackTime, setPlaybackTime] = useState(0);
  
  const ytPlayerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleNextRef = useRef<() => void>();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show famous songs by default
  useEffect(() => {
    if (!searchPerformed && tracks.length === 0) {
      setTracks(famousSongs);
    }
  }, [searchPerformed, tracks.length]);

  const {
    playlist,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    isInPlaylist,
    getNextTrack,
    getPreviousTrack,
    reorderPlaylist,
  } = usePlaylist();

  const {
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    getNextFromQueue,
    shuffleMode,
    toggleShuffle,
    setLastPlayed,
  } = useQueue();

  const { isFavorite, toggleFavorite } = useFavorites();
  const { recordPlay } = useListeningHistory();
  const { preferences, showOnboarding, savePreferences } = useUserPreferences();
  const { location } = useUserLocation();

  // New feature hooks
  const { getLevels, setLevels } = useSongPowerLevels();
  const { dropActive, addDrop, removeDrop, getDrops } = useDropDetector(currentTrack?.id, playbackTime);
  const currentMood = useEnergyTheme(currentTrack?.title, settings.energyThemeEnabled);
  const { profile, setProfile } = useThemeProfile();
  const { recordPlay: recordMemory, getMostPlayed, getRecentlyPlayed } = useMusicMemory();

  // Create background audio element on mount
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      // Enable background playback on mobile
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

  // Set up audio event listeners
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
      setUseBackgroundAudio(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [settings.autoPlayNext]);

  // Load YouTube IFrame API (as fallback)
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
      console.log('YouTube API Ready');
      setYtApiReady(true);
    };
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
      
      if (data.fallback || data.error || !data.audioUrl) {
        return null;
      }

      return data.audioUrl;
    } catch (error) {
      console.error('Failed to fetch audio URL:', error);
      return null;
    }
  }, []);

  const createPlayer = useCallback((videoId: string) => {
    // Destroy existing player if any
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch (e) {
        console.log('Player destroy error:', e);
      }
      ytPlayerRef.current = null;
    }

    // Get container and clear it
    const container = document.getElementById('youtube-player-container');
    if (!container) {
      console.error('Player container not found');
      return;
    }
    
    // Create a new div for the player
    container.innerHTML = '<div id="yt-player"></div>';

    // Create new player
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
          console.log('Player ready, starting playback');
          event.target.setVolume(80);
          event.target.playVideo();
        },
        onStateChange: (event: any) => {
          console.log('Player state:', event.data);
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (event.data === window.YT.PlayerState.ENDED) {
            if (settings.autoPlayNext && handleNextRef.current) {
              handleNextRef.current();
            } else {
              setIsPlaying(false);
            }
          }
        },
        onError: (event: any) => {
          console.error('YouTube Player Error:', event.data);
          toast.error('Could not play this track. Trying next...');
          if (settings.autoPlayNext && handleNextRef.current) {
            setTimeout(() => handleNextRef.current?.(), 1000);
          }
        },
      },
    });
  }, [settings.autoPlayNext]);

  // Play track with background audio support
  const playWithBackgroundAudio = useCallback(async (videoId: string) => {
    if (!useBackgroundAudio) {
      // Fall back to YouTube player
      if (ytApiReady && window.YT && window.YT.Player) {
        createPlayer(videoId);
      }
      return;
    }

    // Try to get audio URL for background playback
    const audioUrl = await fetchAudioUrl(videoId);
    
    if (audioUrl && audioRef.current) {
      // Stop YouTube player if running
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {}
      }

      // Use background audio
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('Playing with background audio');
        })
        .catch((error) => {
          console.error('Background audio failed:', error);
          // Fall back to YouTube
          setUseBackgroundAudio(false);
          if (ytApiReady && window.YT && window.YT.Player) {
            createPlayer(videoId);
          }
        });
    } else {
      // Fall back to YouTube player
      console.log('Falling back to YouTube player');
      if (ytApiReady && window.YT && window.YT.Player) {
        createPlayer(videoId);
      } else {
        toast.error('YouTube player not ready. Please try again.');
      }
    }
  }, [useBackgroundAudio, fetchAudioUrl, ytApiReady, createPlayer]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);
    setPlayingFromPlaylist(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();
      
      if (results.error) {
        throw new Error(results.error);
      }

      setTracks(results);
      toast.success(`Found ${results.length} tracks`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayTrack = useCallback((track: Track) => {
    const index = tracks.findIndex(t => t.id === track.id);
    setCurrentTrack(track);
    setCurrentTrackIndex(index);
    setPlayingFromPlaylist(false);
    setLastPlayed(track.id);

    // Record listening history
    recordPlay(track);
    // Record music memory
    recordMemory(track);

    // Use background audio for mobile-friendly playback
    playWithBackgroundAudio(track.id);
  }, [tracks, playWithBackgroundAudio, setLastPlayed, recordPlay, recordMemory]);

  const handlePlayFromPlaylist = useCallback((track: Track) => {
    setCurrentTrack(track);
    setPlayingFromPlaylist(true);
    setLastPlayed(track.id);

    // Record listening history
    recordPlay(track);
    // Record music memory
    recordMemory(track);

    // Use background audio for mobile-friendly playback
    playWithBackgroundAudio(track.id);
  }, [playWithBackgroundAudio, setLastPlayed, recordPlay, recordMemory]);

  const handlePlayPause = useCallback(() => {
    // Try background audio first
    if (audioRef.current && audioRef.current.src) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
        return;
      } catch (e) {
        console.log('Audio play/pause error:', e);
      }
    }

    // Fall back to YouTube player
    if (!ytPlayerRef.current) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    } catch (e) {
      console.error('Play/pause error:', e);
    }
  }, [isPlaying]);

  // Handle play action for media session
  const handleMediaPlay = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play();
      setIsPlaying(true);
    } else if (ytPlayerRef.current) {
      ytPlayerRef.current.playVideo();
    }
  }, []);

  // Handle pause action for media session
  const handleMediaPause = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    }
  }, []);
  const handleNext = useCallback(() => {
    // First priority: check queue
    const nextFromQueue = getNextFromQueue(playlist);
    if (nextFromQueue) {
      setCurrentTrack(nextFromQueue);
      setPlayingFromPlaylist(false);
      setLastPlayed(nextFromQueue.id);
      playWithBackgroundAudio(nextFromQueue.id);
      return;
    }

    // If playing from playlist
    if (playingFromPlaylist && currentTrack) {
      const nextTrack = getNextTrack(currentTrack.id);
      if (nextTrack) {
        setCurrentTrack(nextTrack);
        setLastPlayed(nextTrack.id);
        playWithBackgroundAudio(nextTrack.id);
        return;
      } else {
        // End of playlist
        setIsPlaying(false);
        toast.info('Playlist ended');
        return;
      }
    }

    // Fall back to search results
    if (tracks.length === 0) return;
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex >= tracks.length) {
      setIsPlaying(false);
      toast.info('End of tracks');
      return;
    }
    const nextTrack = tracks[nextIndex];
    setCurrentTrack(nextTrack);
    setCurrentTrackIndex(nextIndex);
    setPlayingFromPlaylist(false);
    setLastPlayed(nextTrack.id);
    
    playWithBackgroundAudio(nextTrack.id);
  }, [currentTrackIndex, tracks, playWithBackgroundAudio, playingFromPlaylist, currentTrack, getNextTrack, getNextFromQueue, playlist, setLastPlayed]);

  // Keep ref updated to avoid stale closure in createPlayer
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

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

    // Fall back to search results
    if (tracks.length === 0) return;
    const prevIndex = currentTrackIndex <= 0 ? tracks.length - 1 : currentTrackIndex - 1;
    const prevTrack = tracks[prevIndex];
    setCurrentTrack(prevTrack);
    setCurrentTrackIndex(prevIndex);
    setPlayingFromPlaylist(false);
    setLastPlayed(prevTrack.id);
    
    playWithBackgroundAudio(prevTrack.id);
  }, [currentTrackIndex, tracks, playWithBackgroundAudio, playingFromPlaylist, currentTrack, getPreviousTrack, setLastPlayed]);

  // Media Session API for background playback and lock screen controls
  useMediaSession({
    currentTrack,
    isPlaying,
    onPlay: handleMediaPlay,
    onPause: handleMediaPause,
    onNext: handleNext,
    onPrevious: handlePrevious,
    audioRef,
  });

  const handleAddToPlaylist = useCallback((track: Track) => {
    if (isInPlaylist(track.id)) {
      toast.info('Track already in playlist');
      return;
    }
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

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const currentPowerLevels = currentTrack ? getLevels(currentTrack.id) : { hype: 50, chill: 50, aggression: 30 };

  return (
    <div className={cn(
      "min-h-screen bg-background/80 gradient-bg noise-overlay transition-all duration-500",
      settings.powerLevelsEnabled && currentPowerLevels.hype > 80 && isPlaying && "power-hype",
      settings.powerLevelsEnabled && currentPowerLevels.chill > 80 && isPlaying && "power-chill",
      settings.powerLevelsEnabled && currentPowerLevels.aggression > 80 && isPlaying && "power-aggression",
    )}>
      {/* Drop Effect Overlay */}
      {settings.dropDetectorEnabled && <DropEffect active={dropActive} />}

      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="ml-0 md:ml-64">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
        />

        <main className="pt-24 md:pt-28 pb-48 md:pb-36 px-4 md:px-8">
          {/* Genre Onboarding Dialog */}
          <GenreOnboarding
            open={showOnboarding && !showSplash}
            onComplete={savePreferences}
          />

          {/* Energy & Controls Panel - shown when a track is playing */}
          {currentTrack && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in-up">
              {/* Energy Meter & Power Sliders */}
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

              {/* Drop Timestamps */}
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

              {/* Theme Profile Selector */}
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

          {/* Music Memory Panel */}
          {!searchPerformed && settings.musicMemoryEnabled && (
            <div className="mb-8">
              <MusicMemoryPanel
                mostPlayed={getMostPlayed(8)}
                recentlyPlayed={getRecentlyPlayed(8)}
                onPlayTrack={handlePlayTrack}
              />
            </div>
          )}

          {/* Hero Section - only on home without search */}
          {!searchPerformed && (
            <HeroSection 
              onPlayTrack={handlePlayTrack}
            />
          )}

          {/* Trending Section */}
          {!searchPerformed && (
            <TrendingSection 
              onPlayTrack={handlePlayTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onAddToQueue={handleAddToQueue}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {/* Regional Songs Section */}
          {!searchPerformed && location?.country && (
            <PersonalizedSection
              title={`Hits from ${location.state || location.country}`}
              subtitle={`Popular songs in ${location.city ? `${location.city}, ` : ''}${location.state || location.country}`}
              icon="regional"
              searchParams={{ type: 'regional', state: location.state || '', country: location.country || '' }}
              onPlayTrack={handlePlayTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onAddToQueue={handleAddToQueue}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {/* ALL Genre-based Sections from preferences */}
          {!searchPerformed && preferences?.genres && preferences.genres.map((genre) => (
            <PersonalizedSection
              key={genre}
              title={`Because you love ${genre}`}
              subtitle={`Handpicked ${genre} tracks for you`}
              icon="genre"
              searchParams={{ type: 'genre', genre }}
              onPlayTrack={handlePlayTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onAddToQueue={handleAddToQueue}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          ))}

          {searchPerformed && tracks.length > 0 && (
            <div className="mb-8 animate-in-up">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Search Results
              </h1>
              <p className="text-muted-foreground">
                Found {tracks.length} tracks for "<span className="text-primary">{searchQuery}</span>"
              </p>
            </div>
          )}

          {!searchPerformed && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-8 rounded-full bg-primary" />
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Popular Songs
                </h2>
              </div>
              <p className="text-muted-foreground ml-4">
                Discover trending hits and popular tracks
              </p>
            </div>
          )}

          <TrackGrid
            tracks={tracks}
            currentTrack={currentTrack}
            onPlayTrack={handlePlayTrack}
            onAddToQueue={handleAddToQueue}
            isLoading={isLoading}
            searchPerformed={searchPerformed}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </main>
      </div>

      <MusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onAddToPlaylist={handleAddToPlaylist}
        isInPlaylist={currentTrack ? isInPlaylist(currentTrack.id) : false}
        playlist={playlist}
        onPlayFromPlaylist={handlePlayFromPlaylist}
        onRemoveFromPlaylist={handleRemoveFromPlaylist}
        onClearPlaylist={handleClearPlaylist}
        onReorderPlaylist={reorderPlaylist}
        ytPlayerRef={ytPlayerRef}
        audioRef={audioRef}
        shuffleMode={shuffleMode}
        onToggleShuffle={toggleShuffle}
        queue={queue}
        onRemoveFromQueue={removeFromQueue}
        onPlayFromQueue={(track) => {
          removeFromQueue(track.id);
          setCurrentTrack(track);
          setPlayingFromPlaylist(false);
          setLastPlayed(track.id);
          playWithBackgroundAudio(track.id);
        }}
      />
    </div>
  );
};

export default Index;
