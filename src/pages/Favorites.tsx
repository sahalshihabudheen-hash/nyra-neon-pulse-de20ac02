import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import TrackCard from '@/components/TrackCard';
import MusicPlayer from '@/components/MusicPlayer';
import SoundwaveVisualizer from '@/components/SoundwaveVisualizer';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { useQueue } from '@/hooks/useQueue';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

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

const Favorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favoriteTracks, loading, isFavorite, toggleFavorite } = useFavorites();
  const { queue, addToQueue, getNextFromQueue, shuffleMode, toggleShuffle, setLastPlayed } = useQueue();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('favorites');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ytApiReady, setYtApiReady] = useState(false);
  const ytPlayerRef = useRef<any>(null);

  // Load YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtApiReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setYtApiReady(true);
    };

    if (window.YT && window.YT.Player) {
      setYtApiReady(true);
    }
  }, []);

  const createPlayer = useCallback((videoId: string) => {
    const container = document.getElementById('youtube-player-container-favorites');
    if (!container) return;

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch (e) {
        console.error('Error destroying player:', e);
      }
    }

    container.innerHTML = '<div id="youtube-player-favorites"></div>';

    ytPlayerRef.current = new window.YT.Player('youtube-player-favorites', {
      height: '1',
      width: '1',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
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
        onError: () => {
          toast.error('Error playing track');
          handleNext();
        },
      },
    });
  }, []);

  const handlePlay = useCallback((track: Track) => {
    setCurrentTrack(track);
    setLastPlayed(track.id);
    if (ytApiReady && window.YT && window.YT.Player) {
      createPlayer(track.id);
    }
  }, [ytApiReady, createPlayer, setLastPlayed]);

  const handlePlayPause = useCallback(() => {
    if (!ytPlayerRef.current) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    const nextFromQueue = getNextFromQueue(favoriteTracks);
    if (nextFromQueue) {
      setCurrentTrack(nextFromQueue);
      setLastPlayed(nextFromQueue.id);
      if (ytApiReady && window.YT && window.YT.Player) {
        createPlayer(nextFromQueue.id);
      }
      return;
    }

    if (favoriteTracks.length === 0) return;
    const currentIndex = favoriteTracks.findIndex(t => t.id === currentTrack?.id);
    const nextIndex = (currentIndex + 1) % favoriteTracks.length;
    const nextTrack = favoriteTracks[nextIndex];
    setCurrentTrack(nextTrack);
    setLastPlayed(nextTrack.id);
    if (ytApiReady && window.YT && window.YT.Player) {
      createPlayer(nextTrack.id);
    }
  }, [favoriteTracks, currentTrack, ytApiReady, createPlayer, getNextFromQueue, setLastPlayed]);

  const handlePrevious = useCallback(() => {
    if (favoriteTracks.length === 0) return;
    const currentIndex = favoriteTracks.findIndex(t => t.id === currentTrack?.id);
    const prevIndex = currentIndex <= 0 ? favoriteTracks.length - 1 : currentIndex - 1;
    const prevTrack = favoriteTracks[prevIndex];
    setCurrentTrack(prevTrack);
    setLastPlayed(prevTrack.id);
    if (ytApiReady && window.YT && window.YT.Player) {
      createPlayer(prevTrack.id);
    }
  }, [favoriteTracks, currentTrack, ytApiReady, createPlayer, setLastPlayed]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="ml-0 md:ml-64">
          <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearch={handleSearch} />
          <main className="pt-28 pb-32 px-4 md:px-8">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Heart className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Login to See Favorites</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Sign in to save and view your favorite tracks
              </p>
              <Link to="/auth">
                <Button>Login</Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="ml-0 md:ml-64">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearch={handleSearch} />

        <main className="pt-28 pb-48 px-4 md:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Heart className="h-6 w-6 text-primary" fill="currentColor" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">Your Favorites</h1>
                  <SoundwaveVisualizer isPlaying={isPlaying} className="h-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {favoriteTracks.length} {favoriteTracks.length === 1 ? 'track' : 'tracks'} saved
                </p>
              </div>
            </div>
          </div>

          {/* Favorites Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : favoriteTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No Favorites Yet</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Start adding tracks to your favorites by clicking the heart icon
              </p>
              <Link to="/">
                <Button>Discover Music</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {favoriteTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isPlaying={isPlaying && currentTrack?.id === track.id}
                  onPlay={handlePlay}
                  onAddToQueue={addToQueue}
                  isFavorite={isFavorite(track.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </main>

        {/* Music Player */}
        <MusicPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          ytPlayerRef={ytPlayerRef}
          shuffleMode={shuffleMode}
          onToggleShuffle={toggleShuffle}
          queue={queue}
        />

        {/* Hidden YouTube Player Container */}
        <div 
          id="youtube-player-container-favorites"
          className="absolute -top-[1px] left-0 w-1 h-[1px] opacity-0 pointer-events-none overflow-hidden"
        />
      </div>
    </div>
  );
};

export default Favorites;
