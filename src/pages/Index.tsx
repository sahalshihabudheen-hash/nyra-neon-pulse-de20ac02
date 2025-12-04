import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import TrackGrid from '@/components/TrackGrid';
import MusicPlayer from '@/components/MusicPlayer';
import TrendingSection from '@/components/TrendingSection';
import { toast } from 'sonner';
import { usePlaylist } from '@/hooks/usePlaylist';
import { useQueue } from '@/hooks/useQueue';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
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
  
  const ytPlayerRef = useRef<any>(null);
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
      console.log('YouTube API Ready');
      setYtApiReady(true);
    };
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

    if (ytApiReady && window.YT && window.YT.Player) {
      createPlayer(track.id);
    } else {
      toast.error('YouTube player not ready. Please try again.');
    }
  }, [tracks, ytApiReady, createPlayer, setLastPlayed]);

  const handlePlayFromPlaylist = useCallback((track: Track) => {
    setCurrentTrack(track);
    setPlayingFromPlaylist(true);
    setLastPlayed(track.id);

    if (ytApiReady && window.YT && window.YT.Player) {
      createPlayer(track.id);
    } else {
      toast.error('YouTube player not ready. Please try again.');
    }
  }, [ytApiReady, createPlayer, setLastPlayed]);

  const handlePlayPause = useCallback(() => {
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

  const handleNext = useCallback(() => {
    // First priority: check queue
    const nextFromQueue = getNextFromQueue(playlist);
    if (nextFromQueue) {
      setCurrentTrack(nextFromQueue);
      setPlayingFromPlaylist(false);
      setLastPlayed(nextFromQueue.id);
      if (ytApiReady && window.YT && window.YT.Player) {
        createPlayer(nextFromQueue.id);
      }
      return;
    }

    // If playing from playlist
    if (playingFromPlaylist && currentTrack) {
      const nextTrack = getNextTrack(currentTrack.id);
      if (nextTrack) {
        setCurrentTrack(nextTrack);
        setLastPlayed(nextTrack.id);
        if (ytApiReady && window.YT && window.YT.Player) {
          createPlayer(nextTrack.id);
        }
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
    
    if (ytApiReady && window.YT && window.YT.Player) {
      createPlayer(nextTrack.id);
    }
  }, [currentTrackIndex, tracks, ytApiReady, createPlayer, playingFromPlaylist, currentTrack, getNextTrack, getNextFromQueue, playlist, setLastPlayed]);

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
        if (ytApiReady && window.YT && window.YT.Player) {
          createPlayer(prevTrack.id);
        }
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
    
    if (ytApiReady && window.YT && window.YT.Player) {
      createPlayer(prevTrack.id);
    }
  }, [currentTrackIndex, tracks, ytApiReady, createPlayer, playingFromPlaylist, currentTrack, getPreviousTrack, setLastPlayed]);

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

  return (
    <div className="min-h-screen bg-background/80 gradient-bg">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="ml-0 md:ml-64">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
        />

        <main className="pt-28 pb-48 md:pb-36 px-4 md:px-8">
          {/* Trending Section */}
          {!searchPerformed && (
            <TrendingSection 
              onPlayTrack={handlePlayTrack}
              currentTrack={currentTrack}
              onAddToQueue={handleAddToQueue}
            />
          )}

          {searchPerformed && tracks.length > 0 && (
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Search Results
              </h1>
              <p className="text-muted-foreground">
                Found {tracks.length} tracks for "{searchQuery}"
              </p>
            </div>
          )}

          {!searchPerformed && (
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Popular Songs
              </h2>
              <p className="text-muted-foreground">
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
        ytPlayerRef={ytPlayerRef}
        shuffleMode={shuffleMode}
        onToggleShuffle={toggleShuffle}
        queue={queue}
      />
    </div>
  );
};

export default Index;
