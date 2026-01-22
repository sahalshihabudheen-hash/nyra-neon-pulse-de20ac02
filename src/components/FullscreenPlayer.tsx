import { useState } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ListMusic, Heart, Trash2, ChevronDown } from 'lucide-react';
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
  const [showQueue, setShowQueue] = useState(true);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col animate-fade-in">
      {/* Background gradient effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.4), transparent 70%)`,
        }}
      />
      
      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none noise-overlay" />

      {/* Header */}
      <div className="relative flex items-center justify-between p-4 md:p-6">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-95"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-foreground">Now Playing</h2>
        <button
          onClick={() => setShowQueue(!showQueue)}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95",
            showQueue ? "bg-primary/20 text-primary" : "bg-white/10 hover:bg-white/20"
          )}
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 p-4 md:p-8 overflow-hidden">
        {/* Album Art & Track Info */}
        <div className="flex flex-col items-center gap-6 flex-shrink-0">
          {/* Album Art */}
          <div className="relative group">
            {/* Glow effect */}
            <div 
              className={cn(
                "absolute -inset-4 md:-inset-8 rounded-3xl blur-2xl transition-opacity duration-500",
                isPlaying ? "opacity-60" : "opacity-30"
              )}
              style={{ background: 'var(--theme-gradient, hsl(var(--primary)))' }}
            />
            
            {/* Album image */}
            <div className="relative">
              <img
                src={currentTrack?.thumbnail || '/placeholder.svg'}
                alt={currentTrack?.title || 'No track'}
                className={cn(
                  "w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-2xl object-cover shadow-2xl transition-transform duration-500",
                  isPlaying && "animate-pulse-slow"
                )}
              />
              
              {/* Playing indicator overlay */}
              {isPlaying && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-white rounded-full equalizer-bar shadow-lg"
                      style={{ height: '20px' }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Track Info */}
          <div className="text-center max-w-sm md:max-w-md">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2 line-clamp-2">
              {currentTrack?.title || 'No track selected'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {currentTrack?.channel || 'Select a track to play'}
            </p>
          </div>

          {/* Soundwave Visualizer */}
          {settings.soundwaveEnabled && (
            <div className="w-full max-w-xs md:max-w-sm">
              <div className="bg-black/40 rounded-xl px-6 py-4 border border-primary/20">
                <SoundwaveVisualizer isPlaying={isPlaying} className="h-16 w-full" />
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full max-w-xs md:max-w-md">
            <div className="relative h-2 rounded-full bg-white/10 overflow-hidden group cursor-pointer">
              <div 
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{ 
                  width: `${progressPercent}%`,
                  background: 'var(--theme-gradient, hsl(var(--primary)))',
                  boxShadow: '0 0 10px hsl(var(--primary))',
                }}
              />
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={progress}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {/* Handle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary shadow-lg border-2 border-white transition-all pointer-events-none"
                style={{ left: `calc(${progressPercent}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground font-mono">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 md:gap-6">
            <button 
              onClick={onToggleShuffle}
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90',
                shuffleMode ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
              )}
            >
              <Shuffle className="w-5 h-5" />
            </button>
            
            <button
              onClick={onPrevious}
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
            >
              <SkipBack className="w-6 h-6" fill="currentColor" />
            </button>
            
            <button
              onClick={onPlayPause}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 relative"
              style={{ background: 'var(--theme-gradient, hsl(var(--primary)))' }}
            >
              {isPlaying && (
                <div className="absolute inset-0 rounded-full bg-primary/40 blur-xl animate-pulse" />
              )}
              <div className="relative text-primary-foreground">
                {isPlaying ? (
                  <Pause className="w-8 h-8" fill="currentColor" />
                ) : (
                  <Play className="w-8 h-8 ml-1" fill="currentColor" />
                )}
              </div>
            </button>
            
            <button
              onClick={onNext}
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
            >
              <SkipForward className="w-6 h-6" fill="currentColor" />
            </button>
            
            <button className="w-12 h-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 flex items-center justify-center transition-all active:scale-90">
              <Repeat className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue Panel */}
        {showQueue && (
          <div className="w-full md:w-80 lg:w-96 h-64 md:h-full max-h-[50vh] md:max-h-full bg-black/40 rounded-2xl border border-white/10 overflow-hidden flex flex-col animate-scale-in">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-primary" />
                Queue ({queue.length})
              </h3>
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
                <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                  <ListMusic className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Queue is empty</p>
                  <p className="text-xs mt-1 opacity-60">Add songs to play next</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullscreenPlayer;
