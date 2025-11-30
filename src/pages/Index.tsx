import { useState, useRef, useCallback, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import TrackGrid from '@/components/TrackGrid';
import MusicPlayer from '@/components/MusicPlayer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  
  const playerRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API Ready');
    };
  }, []);

  const initializePlayer = useCallback((videoId: string) => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy();
    }

    ytPlayerRef.current = new window.YT.Player('youtube-player', {
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
      },
      events: {
        onReady: (event: any) => {
          event.target.playVideo();
          setIsPlaying(true);
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            handleNext();
          } else if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          }
        },
      },
    });
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);

    try {
      const { data, error } = await supabase.functions.invoke('youtube-search', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: undefined,
      });

      // Since we can't pass query params directly, let's use the URL approach
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

    if (window.YT && window.YT.Player) {
      initializePlayer(track.id);
    } else {
      // Fallback: wait for API to load
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT);
          initializePlayer(track.id);
        }
      }, 100);
    }
  }, [tracks, initializePlayer]);

  const handlePlayPause = useCallback(() => {
    if (!ytPlayerRef.current) return;

    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    if (tracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % tracks.length;
    handlePlayTrack(tracks[nextIndex]);
  }, [currentTrackIndex, tracks, handlePlayTrack]);

  const handlePrevious = useCallback(() => {
    if (tracks.length === 0) return;
    const prevIndex = currentTrackIndex <= 0 ? tracks.length - 1 : currentTrackIndex - 1;
    handlePlayTrack(tracks[prevIndex]);
  }, [currentTrackIndex, tracks, handlePlayTrack]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-background gradient-bg">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="ml-64">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
        />

        <main className="pt-28 pb-32 px-8">
          {/* Section Header */}
          {searchPerformed && tracks.length > 0 && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Search Results
              </h1>
              <p className="text-muted-foreground">
                Found {tracks.length} tracks for "{searchQuery}"
              </p>
            </div>
          )}

          {/* Track Grid */}
          <TrackGrid
            tracks={tracks}
            currentTrack={currentTrack}
            onPlayTrack={handlePlayTrack}
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
        playerRef={playerRef}
      />
    </div>
  );
};

export default Index;
