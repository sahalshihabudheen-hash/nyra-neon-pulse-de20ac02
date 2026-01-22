import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ListMusic, Trash2, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import SoundwaveVisualizer from './SoundwaveVisualizer';
import { ScrollArea } from './ui/scroll-area';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  shuffleMode?: boolean;
  onToggleShuffle?: () => void;
  queue: Track[];
  onRemoveFromQueue?: (trackId: string) => void;
  onPlayFromQueue?: (track: Track) => void;
  progress: number;
  duration: number;
  onSeek: (value: number) => void;
}

const FullscreenPlayer = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  shuffleMode = false,
  onToggleShuffle,
  queue,
  onRemoveFromQueue,
  onPlayFromQueue,
  progress,
  duration,
  onSeek,
}: FullscreenPlayerProps) => {
  const { settings } = useTheme();
  const [showQueue, setShowQueue] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isVisible && !isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[100] flex flex-col transition-all duration-300 overflow-hidden",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{ 
        background: 'linear-gradient(180deg, hsl(0 0% 6%) 0%, hsl(0 0% 3%) 100%)',
      }}
    >
      {/* Background with album art blur */}
      {currentTrack && (
        <div 
          className="absolute inset-0 opacity-20 blur-3xl scale-110"
          style={{
            backgroundImage: `url(${currentTrack.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.15), transparent 60%),
                       linear-gradient(180deg, transparent 0%, hsl(0 0% 3% / 0.8) 100%)`,
        }}
      />

      {/* Header */}
      <header className="relative flex items-center justify-between px-4 py-3 md:px-6 md:py-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 touch-manipulation"
          aria-label="Close"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Now Playing</p>
          <p className="text-sm font-medium text-foreground/80 truncate max-w-[200px]">
            {currentTrack?.channel || 'Unknown Artist'}
          </p>
        </div>
        
        <button
          onClick={() => setShowQueue(!showQueue)}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 touch-manipulation",
            showQueue ? "text-primary" : "bg-white/10 hover:bg-white/20"
          )}
          style={showQueue ? { background: 'var(--theme-gradient, hsl(var(--primary) / 0.2))' } : undefined}
          aria-label="Toggle queue"
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-hidden">
        {/* Queue Panel - Mobile Overlay / Desktop Side Panel */}
        {showQueue && (
          <>
            {/* Mobile: Full overlay */}
            <div className="md:hidden fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col animate-fade-in">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-primary" />
                  Queue ({queue.length})
                </h3>
                <button
                  onClick={() => setShowQueue(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ScrollArea className="flex-1">
                {queue.length > 0 ? (
                  <div className="p-3 space-y-2">
                    {queue.map((track, index) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 active:bg-white/10 transition-all"
                        onClick={() => {
                          onPlayFromQueue?.(track);
                          setShowQueue(false);
                        }}
                      >
                        <span className="w-6 text-center text-sm text-primary font-bold">
                          {index + 1}
                        </span>
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-foreground">{track.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{track.channel}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromQueue?.(track.id);
                          }}
                          className="w-10 h-10 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <ListMusic className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Queue is empty</p>
                    <p className="text-sm opacity-60 mt-1">Add songs to play next</p>
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* Desktop: Side panel */}
            <div className="hidden md:flex absolute right-4 top-0 bottom-0 w-80 lg:w-96 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex-col animate-scale-in overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-primary" />
                  Queue ({queue.length})
                </h3>
                <button
                  onClick={() => setShowQueue(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="flex-1">
                {queue.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {queue.map((track, index) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 group transition-all cursor-pointer"
                        onClick={() => onPlayFromQueue?.(track)}
                      >
                        <span className="w-6 text-center text-sm text-muted-foreground font-mono">
                          {index + 1}
                        </span>
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full rounded object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
                            <Play className="w-4 h-4" fill="currentColor" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.channel}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromQueue?.(track.id);
                          }}
                          className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <ListMusic className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">Queue is empty</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        )}

        {/* Album Art */}
        <div className={cn(
          "relative mb-6 md:mb-8 transition-all duration-300",
          showQueue && "md:mr-80 lg:mr-96"
        )}>
          {/* Glow effect */}
          <div 
            className={cn(
              "absolute -inset-6 md:-inset-10 rounded-3xl blur-3xl transition-opacity duration-700",
              isPlaying ? "opacity-50" : "opacity-20"
            )}
            style={{ background: 'var(--theme-gradient, hsl(var(--primary)))' }}
          />
          
          {/* Album image */}
          <div className="relative">
            <img
              src={currentTrack?.thumbnail || '/placeholder.svg'}
              alt={currentTrack?.title || 'No track'}
              className={cn(
                "w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-2xl md:rounded-3xl object-cover shadow-2xl transition-transform duration-700",
                isPlaying && "scale-[1.02]"
              )}
            />
            
            {/* Playing indicator overlay */}
            {isPlaying && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-primary rounded-full equalizer-bar"
                    style={{ height: '12px' }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Track Info */}
        <div className={cn(
          "text-center mb-4 md:mb-6 max-w-sm md:max-w-lg px-4 transition-all duration-300",
          showQueue && "md:mr-80 lg:mr-96"
        )}>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1 line-clamp-2">
            {currentTrack?.title || 'No track selected'}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {currentTrack?.channel || 'Select a track to play'}
          </p>
        </div>

        {/* Soundwave Visualizer */}
        {settings.soundwaveEnabled && (
          <div className={cn(
            "w-full max-w-xs md:max-w-sm mb-6 transition-all duration-300",
            showQueue && "md:mr-80 lg:mr-96"
          )}>
            <div className="bg-black/40 rounded-xl px-4 py-3 border border-primary/20">
              <SoundwaveVisualizer isPlaying={isPlaying} className="h-12 md:h-16 w-full" />
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className={cn(
          "w-full max-w-xs sm:max-w-sm md:max-w-md px-2 mb-6 md:mb-8 transition-all duration-300",
          showQueue && "md:mr-80 lg:mr-96"
        )}>
          <div className="relative h-1.5 md:h-2 rounded-full bg-white/10 overflow-hidden cursor-pointer group">
            <div 
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-100"
              style={{ 
                width: `${progressPercent}%`,
                background: 'var(--theme-gradient, hsl(var(--primary)))',
                boxShadow: '0 0 12px hsl(var(--primary))',
              }}
            />
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={progress}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation"
            />
            {/* Handle */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 rounded-full shadow-lg border-2 border-white transition-all pointer-events-none opacity-0 group-hover:opacity-100"
              style={{ 
                left: `calc(${progressPercent}% - 8px)`,
                background: 'var(--theme-gradient, hsl(var(--primary)))',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs md:text-sm text-muted-foreground font-mono">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className={cn(
          "flex items-center justify-center gap-3 sm:gap-4 md:gap-6 transition-all duration-300",
          showQueue && "md:mr-80 lg:mr-96"
        )}>
          <button 
            onClick={onToggleShuffle}
            className={cn(
              'w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation',
              shuffleMode ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
            )}
            style={shuffleMode ? { background: 'var(--theme-gradient, hsl(var(--primary) / 0.2))' } : undefined}
          >
            <Shuffle className="w-5 h-5" />
          </button>
          
          <button
            onClick={onPrevious}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-90 touch-manipulation"
          >
            <SkipBack className="w-6 h-6" fill="currentColor" />
          </button>
          
          <button
            onClick={onPlayPause}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all active:scale-95 relative touch-manipulation"
            style={{ background: 'var(--theme-gradient, hsl(var(--primary)))' }}
          >
            {isPlaying && (
              <div 
                className="absolute inset-0 rounded-full blur-xl animate-pulse"
                style={{ background: 'var(--theme-gradient, hsl(var(--primary) / 0.4))' }}
              />
            )}
            <div className="relative text-primary-foreground">
              {isPlaying ? (
                <Pause className="w-7 h-7 md:w-8 md:h-8" fill="currentColor" />
              ) : (
                <Play className="w-7 h-7 md:w-8 md:h-8 ml-1" fill="currentColor" />
              )}
            </div>
          </button>
          
          <button
            onClick={onNext}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-90 touch-manipulation"
          >
            <SkipForward className="w-6 h-6" fill="currentColor" />
          </button>
          
          <button className="w-11 h-11 md:w-12 md:h-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 flex items-center justify-center transition-all active:scale-90 touch-manipulation">
            <Repeat className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default FullscreenPlayer;
