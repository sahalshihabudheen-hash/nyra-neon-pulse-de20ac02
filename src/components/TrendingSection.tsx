import { useState, useEffect } from 'react';
import { TrendingUp, Play, ListPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AddToPlaylistDialog from './AddToPlaylistDialog';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface TrendingSectionProps {
  onPlayTrack: (track: Track) => void;
  currentTrack: Track | null;
  onAddToQueue?: (track: Track) => void;
}

const TrendingSection = ({ onPlayTrack, currentTrack, onAddToQueue }: TrendingSectionProps) => {
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search?q=${encodeURIComponent('trending music 2025 hits')}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch trending');

      const results = await response.json();
      if (results.error) throw new Error(results.error);

      setTrendingTracks(results.slice(0, 20));
    } catch (error) {
      console.error('Trending fetch error:', error);
      // Fallback to some default trending tracks
      setTrendingTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('trending-scroll');
    if (container) {
      const scrollAmount = 300;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  if (loading) {
    return (
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Trending Now</h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44 animate-pulse">
              <div className="w-full aspect-square rounded-xl bg-secondary" />
              <div className="mt-3 h-4 bg-secondary rounded w-3/4" />
              <div className="mt-2 h-3 bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (trendingTracks.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Trending Now</h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scrollContainer('left')}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollContainer('right')}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        id="trending-scroll"
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
      >
        {trendingTracks.map((track) => (
          <div
            key={track.id}
            className={cn(
              'flex-shrink-0 w-40 md:w-44 group cursor-pointer',
              currentTrack?.id === track.id && 'scale-105'
            )}
          >
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-secondary">
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => onPlayTrack(track)}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-transform neon-glow"
                  >
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                  </button>
                  {onAddToQueue && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToQueue(track);
                      }}
                      className="w-10 h-10 rounded-full bg-secondary/80 text-foreground flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
                      title="Add to Queue"
                    >
                      <ListPlus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              {currentTrack?.id === track.id && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  Playing
                </div>
              )}
            </div>
            <h3 className="mt-3 text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {track.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
              {track.channel}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TrendingSection;
