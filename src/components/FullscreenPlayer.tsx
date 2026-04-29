import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ListMusic, Trash2, ChevronDown, X, SlidersHorizontal, Share2, Zap, Heart, Music2, Headphones, Minus, Plus, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import StyledProgressBar from './StyledProgressBar';
import SoundwaveVisualizer from './SoundwaveVisualizer';
import EqualizerPanel from './EqualizerPanel';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

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
  loopMode?: 'off' | 'all' | 'one';
  onCycleLoopMode?: () => void;
  queue: Track[];
  onRemoveFromQueue?: (trackId: string) => void;
  onPlayFromQueue?: (track: Track) => void;
  progress: number;
  duration: number;
  onSeek: (value: number) => void;
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
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
  loopMode = 'off',
  onCycleLoopMode,
  queue,
  onRemoveFromQueue,
  onPlayFromQueue,
  progress,
  duration,
  onSeek,
  audioRef,
}: FullscreenPlayerProps) => {
  const { settings } = useTheme();
  const [showQueue, setShowQueue] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    if (currentTrack) {
      const shareUrl = `${window.location.origin}/api/og?id=${currentTrack.id}&title=${encodeURIComponent(currentTrack.title)}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied!');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

    };
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  const node = (
    <div
      className={cn(
        "fixed inset-0 z-[9999] w-screen h-[100dvh] flex flex-col overflow-hidden transition-all duration-700 ease-in-out",
        isOpen ? "opacity-100 scale-100" : "opacity-0 scale-110 pointer-events-none"
      )}
      role="dialog"
      aria-modal="true"
    >
      {/* Immersive Background */}
      <div className="absolute inset-0 bg-[#080808]">
        {currentTrack && (
          <div 
            className="absolute inset-0 opacity-40 blur-[120px] scale-150 transition-all duration-1000"
            style={{
              backgroundImage: `url(${currentTrack.thumbnail})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080808]/80 to-[#080808]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-10">
        <button onClick={onClose} className="w-12 h-12 rounded-2xl glass-premium border-white/5 flex items-center justify-center transition-all active:scale-90 hover:bg-white/10">
          <ChevronDown className="w-6 h-6" />
        </button>
        
        <div className="text-center group cursor-default">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-1">Now Playing</p>
          <div className="flex items-center justify-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             <p className="text-sm font-black text-foreground uppercase tracking-widest">{currentTrack?.channel || 'Unknown'}</p>
          </div>
        </div>
        
        <button onClick={() => setShowQueue(!showQueue)} className={cn("w-12 h-12 rounded-2xl glass-premium border-white/5 flex items-center justify-center transition-all active:scale-90", showQueue ? "bg-primary text-primary-foreground border-primary" : "hover:bg-white/10")}>
          <ListMusic className="w-5 h-5" />
        </button>
      </header>

          {/* Soundwave */}
          <div className="w-full max-w-md mb-10">
             <div className="glass-premium border border-white/5 p-6 rounded-3xl shadow-xl">
                <SoundwaveVisualizer isPlaying={isPlaying} className="h-16 w-full" shape="spectrum" />
             </div>
          </div>

          {/* Progress */}
          <div className="w-full max-w-2xl px-4 mb-12">
             <StyledProgressBar progress={progress} duration={duration} onSeek={onSeek} className="mb-4" />
             <div className="flex justify-between text-xs font-black text-muted-foreground/60 tabular-nums tracking-widest">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
             </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 md:gap-10">
             <button onClick={onToggleShuffle} className={cn("p-4 rounded-2xl transition-all", shuffleMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}>
                <Shuffle className="w-6 h-6" />
             </button>
             
             <button onClick={onPrevious} className="p-4 rounded-full glass-premium border-white/5 hover:bg-white/10 transition-all active:scale-75">
                <SkipBack className="w-8 h-8 fill-current" />
             </button>
             
             <button onClick={onPlayPause} className="w-24 h-24 md:w-32 md:h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 active:scale-90 relative shadow-[0_20px_50px_rgba(var(--primary),0.3)]" style={{ background: 'var(--theme-gradient, hsl(var(--primary)))' }}>
                <div className="relative text-primary-foreground">
                   {isPlaying ? <Pause className="w-10 h-10 md:w-12 md:h-12 fill-current" /> : <Play className="w-10 h-10 md:w-12 md:h-12 fill-current ml-2" />}
                </div>
             </button>

             <button onClick={onNext} className="p-4 rounded-full glass-premium border-white/5 hover:bg-white/10 transition-all active:scale-75">
                <SkipForward className="w-8 h-8 fill-current" />
             </button>

             <button onClick={onCycleLoopMode} className={cn("p-4 rounded-2xl transition-all", loopMode !== 'off' ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground")}>
                {loopMode === 'one' ? <Repeat1 className="w-6 h-6" /> : <Repeat className="w-6 h-6" />}
             </button>
          </div>

          {/* Bottom Actions */}
          <div className="mt-12 flex items-center gap-6">
             <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-premium border-white/5">
                <button onClick={() => audioRef?.current && (audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.1))} className="p-3 rounded-xl hover:bg-white/5 text-muted-foreground transition-all">
                   <Minus className="w-4 h-4" />
                </button>
                <button onClick={() => audioRef?.current && (audioRef.current.muted = !audioRef.current.muted)} className="p-3 rounded-xl hover:bg-white/5 text-primary transition-all">
                   <Volume2 className="w-5 h-5" />
                </button>
                <button onClick={() => audioRef?.current && (audioRef.current.volume = Math.min(1, audioRef.current.volume + 0.1))} className="p-3 rounded-xl hover:bg-white/5 text-muted-foreground transition-all">
                   <Plus className="w-4 h-4" />
                </button>
             </div>

             <div className="flex items-center gap-3">
                <button onClick={() => setShowEQ(!showEQ)} className={cn("flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all", showEQ ? "bg-primary text-primary-foreground" : "glass-premium border-white/5 hover:bg-white/10")}>
                    <SlidersHorizontal className="w-4 h-4" />
                    Equalizer
                </button>
             </div>
          </div>
        </div>



        {/* Queue Overlay (Desktop Side) */}
        {showQueue && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 md:p-10 animate-fade-in">
             <div className="w-full max-w-2xl h-full glass-premium border border-white/10 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl backdrop-blur-3xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <ListMusic className="w-8 h-8 text-primary" />
                      <div>
                         <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter italic">Engine Queue</h3>
                         <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{queue.length} Tracks Ready</p>
                      </div>
                   </div>
                   <button onClick={() => setShowQueue(false)} className="w-12 h-12 rounded-2xl hover:bg-white/5 flex items-center justify-center">
                      <X className="w-6 h-6" />
                   </button>
                </div>
                <ScrollArea className="flex-1 p-4">
                   {queue.length > 0 ? (
                      <div className="space-y-2">
                         {queue.map((track, idx) => (
                            <div key={track.id} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white/5 transition-all cursor-pointer group" onClick={() => onPlayFromQueue?.(track)}>
                               <span className="text-xs font-black text-primary/40 w-6">{idx + 1}</span>
                               <img src={track.thumbnail} className="w-14 h-14 rounded-2xl object-cover" />
                               <div className="flex-1 min-w-0">
                                  <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">{track.title}</p>
                                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{track.channel}</p>
                               </div>
                               <button onClick={(e) => { e.stopPropagation(); onRemoveFromQueue?.(track.id); }} className="p-3 rounded-xl hover:bg-destructive/20 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-20">
                         <Music2 className="w-20 h-20 mb-4" />
                         <p className="font-black uppercase tracking-widest">Queue Empty</p>
                      </div>
                   )}
                </ScrollArea>
             </div>
          </div>
        )}

        {/* Equalizer Overlay */}
        {showEQ && audioRef && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-fade-in">
             <div className="w-full max-w-sm glass-premium border border-white/10 rounded-[3rem] p-10 shadow-2xl backdrop-blur-3xl">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter">Audio Matrix</h3>
                   <button onClick={() => setShowEQ(false)} className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                <EqualizerPanel audioRef={audioRef} isOpen={showEQ} onClose={() => setShowEQ(false)} />
             </div>
          </div>
        )}


      </main>
    </div>
  );

  return createPortal(node, document.body);
};

export default FullscreenPlayer;

