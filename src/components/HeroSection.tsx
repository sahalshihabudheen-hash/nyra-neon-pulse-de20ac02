import { useState, useEffect } from 'react';
import { Play, Sparkles, TrendingUp, Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface HeroSectionProps {
  onPlayTrack?: (track: Track) => void;
  featuredTrack?: Track | null;
}

const HeroSection = ({ onPlayTrack, featuredTrack: propFeaturedTrack }: HeroSectionProps) => {
  const { gradient } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [featuredTrack, setFeaturedTrack] = useState<Track | null>(propFeaturedTrack || null);
  const [loading, setLoading] = useState(!propFeaturedTrack);

  useEffect(() => {
    setIsVisible(true);
    // Fetch dynamic featured track if none provided
    if (!propFeaturedTrack) {
      fetchFeatured();
    }
  }, [propFeaturedTrack]);

  const fetchFeatured = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-featured`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          setFeaturedTrack(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch featured:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayFeatured = () => {
    if (featuredTrack && onPlayTrack) {
      onPlayTrack(featuredTrack);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl mb-8">
      {/* Animated background */}
      <div className="absolute inset-0 gradient-animated opacity-50" />
      
      {/* Glow orbs */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl float" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-primary/10 blur-3xl float" style={{ animationDelay: '2s' }} />
      
      {/* Main content */}
      <div className={cn(
        "relative z-10 glass-premium rounded-3xl p-6 md:p-10 transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          {/* Featured Album Art */}
          <div className="relative group">
            <div className="absolute -inset-2 rounded-2xl bg-primary/30 blur-xl glow-pulse opacity-60" />
            <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl">
              {featuredTrack ? (
                <img
                  src={featuredTrack.thumbnail}
                  alt={featuredTrack.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <Disc3 className="w-16 h-16 text-primary rotate-glow" />
                </div>
              )}
              
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={handlePlayFeatured}
                  className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center transform scale-75 group-hover:scale-100 transition-all neon-glow"
                >
                  <Play className="w-8 h-8 ml-1" fill="currentColor" />
                </button>
              </div>
            </div>
            
            {/* Spinning ring decoration */}
            <div className="absolute -inset-4 border-2 border-primary/20 rounded-3xl rotate-glow pointer-events-none" />
          </div>

          {/* Hero Text */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-primary text-sm font-medium uppercase tracking-wider">
                Featured Today
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 leading-tight">
              {featuredTrack ? (
                <span className="theme-gradient-text">{featuredTrack.title.slice(0, 40)}...</span>
              ) : (
                <span className="theme-gradient-text">Discover Your Vibe</span>
              )}
            </h1>
            
            <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-md">
              {featuredTrack 
                ? featuredTrack.channel 
                : "Explore trending tracks, create playlists, and feel the pulse of music."}
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={handlePlayFeatured}
                disabled={!featuredTrack}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all active:scale-95 touch-manipulation",
                  "bg-primary text-primary-foreground hover:neon-glow disabled:opacity-50"
                )}
                style={gradient.enabled ? { background: 'var(--theme-gradient)' } : { backgroundColor: 'hsl(var(--primary))' }}
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Play Now
              </button>
              
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 text-muted-foreground text-sm">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Trending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-8 rounded-full bg-primary/30 soundwave-bar"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
