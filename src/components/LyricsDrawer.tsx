import { useState, useEffect, useRef } from 'react';
import { X, Music2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface LyricsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LyricsDrawer = ({ isOpen, onClose }: LyricsDrawerProps) => {
  const { currentTrack } = useMusicPlayer();
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const lastTrackId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !currentTrack) return;
    if (lastTrackId.current === currentTrack.id) return;

    lastTrackId.current = currentTrack.id;
    setLyrics(null);
    setError(null);
    setIsLoading(true);

    const fetchLyrics = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-lyrics', {
          body: {
            trackId: currentTrack.id,
            trackTitle: currentTrack.title,
            trackChannel: currentTrack.channel,
          },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        if (!data?.lyrics) {
          setLyrics(null);
          setSource(data?.source || 'unavailable');
          setError(null);
          return;
        }

        setLyrics(data.lyrics);
        setSource(data.source || 'official');
      } catch (e: any) {
        console.error('Lyrics fetch error:', e);
        setError(e.message || 'Could not load lyrics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [isOpen, currentTrack?.id]);

  // Reset when track changes while drawer is closed
  useEffect(() => {
    if (!isOpen) {
      lastTrackId.current = null;
    }
  }, [currentTrack?.id, isOpen]);

  if (!isVisible && !isOpen) return null;

  const renderLyrics = () => {
    if (!lyrics) return null;

    return lyrics.split('\n').map((line, i) => {
      const isSectionHeader = /^\[.*\]$/.test(line.trim());
      if (line.trim() === '') return <div key={i} className="h-4" />;

      return (
        <p
          key={i}
          className={cn(
            'leading-relaxed transition-colors',
            isSectionHeader
              ? 'text-primary font-bold text-sm uppercase tracking-wider mt-6 mb-2'
              : 'text-foreground/90 text-base md:text-lg'
          )}
        >
          {line}
        </p>
      );
    });
  };

  return (
    <div
      className={cn(
        'fixed right-0 top-0 bottom-0 z-[9997] w-full sm:w-96 md:w-[420px]',
        'bg-background/95 backdrop-blur-xl border-l border-border/40',
        'flex flex-col transition-transform duration-300 ease-out shadow-2xl',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Music2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Lyrics</h3>
            {source && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                <span>{source === 'ai' ? 'AI Generated' : 'Official'}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Track info */}
      {currentTrack && (
        <div className="px-5 py-3 border-b border-border/20 flex items-center gap-3 shrink-0">
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-10 h-10 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-foreground truncate">{currentTrack.title}</p>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.channel}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">Fetching lyrics...</p>
              <p className="text-xs mt-1 opacity-60">This may take a moment</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <AlertCircle className="w-8 h-8 text-destructive/60 mb-4" />
              <p className="text-sm font-medium">Couldn't load lyrics</p>
              <p className="text-xs mt-1 opacity-60">{error}</p>
            </div>
          )}

          {!isLoading && !error && !currentTrack && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Music2 className="w-12 h-12 opacity-20 mb-4" />
              <p className="text-sm font-medium">No track playing</p>
              <p className="text-xs mt-1 opacity-60">Play a song to see lyrics</p>
            </div>
          )}

          {!isLoading && !error && lyrics && (
            <div className="space-y-0.5">{renderLyrics()}</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default LyricsDrawer;
