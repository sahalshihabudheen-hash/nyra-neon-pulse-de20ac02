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
      <div className="absolute inset-0 bg-[#050505]">
        {currentTrack && (
          <>
            <div 
              className="absolute inset-0 opacity-50 blur-[140px] scale-150 transition-all duration-[1500ms]"
              style={{
                backgroundImage: `url(${currentTrack.thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            {/* Animated ambient orbs */}
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[140px] animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[140px] animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/70 to-[#050505]" />
        {/* Subtle noise/grain overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")'
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 md:px-10 md:py-6">
        <button onClick={onClose} className="w-11 h-11 rounded-2xl glass-premium border border-white/10 flex items-center justify-center transition-all active:scale-90 hover:bg-white/10 hover:border-primary/30">
          <ChevronDown className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <p className="text-[9px] font-black text-primary/80 uppercase tracking-[0.5em] mb-1.5">Now Playing</p>
          <div className="flex items-center justify-center gap-2">
             <div className="relative">
               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping absolute" />
               <div className="w-1.5 h-1.5 rounded-full bg-primary" />
             </div>
             <p className="text-xs font-bold text-foreground/90 uppercase tracking-[0.25em] truncate max-w-[180px]">{currentTrack?.channel || 'Unknown'}</p>
          </div>
        </div>
        
        <button onClick={() => setShowQueue(!showQueue)} className={cn("w-11 h-11 rounded-2xl glass-premium border flex items-center justify-center transition-all active:scale-90", showQueue ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]" : "border-white/10 hover:bg-white/10 hover:border-primary/30")}>
          <ListMusic className="w-5 h-5" />
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-4 md:pb-6 overflow-y-auto min-h-0">
        <div className="flex flex-col items-center justify-center w-full max-w-2xl my-auto">
          {/* Album Art with vinyl ring */}
          <div className="relative mb-4 md:mb-6 group">
            <div className={cn(
              "absolute -inset-8 rounded-full blur-3xl transition-all duration-1000",
              isPlaying ? "bg-primary/30 opacity-100 scale-100" : "bg-primary/10 opacity-50 scale-90"
            )} />
            <div 
              className={cn(
                "absolute -inset-3 rounded-[3rem] border border-white/10",
                isPlaying && "animate-spin"
              )}
              style={{ animationDuration: '20s' }}
            >
              <div className="absolute top-2 left-1/2 w-2 h-2 rounded-full bg-primary -translate-x-1/2 shadow-[0_0_10px_hsl(var(--primary))]" />
            </div>
            <img 
              src={currentTrack?.thumbnail || '/placeholder.svg'} 
              alt={currentTrack?.title}
              className={cn(
                "w-40 h-40 sm:w-52 sm:h-52 md:w-60 md:h-60 rounded-[2rem] object-cover shadow-[0_30px_80px_rgba(0,0,0,0.6)] transition-all duration-700 relative z-10 ring-1 ring-white/10",
                isPlaying ? "scale-100" : "scale-95 opacity-90"
              )}
            />
          </div>

          {/* Title & Artist */}
          <div className="text-center mb-4 md:mb-5 max-w-xl px-4">
             <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-foreground mb-1.5 tracking-tight italic uppercase line-clamp-2 leading-tight">
               {currentTrack?.title || 'Not Selected'}
             </h2>
             <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-[0.35em]">{currentTrack?.channel || 'Unknown Artist'}</p>
          </div>

          {/* Soundwave */}
          <div className="w-full max-w-md mb-4 px-4 hidden sm:block">
             <div className="glass-premium border border-white/10 px-6 py-3 rounded-3xl shadow-xl backdrop-blur-2xl">
                <SoundwaveVisualizer isPlaying={isPlaying} className="h-10 w-full" shape="spectrum" />
             </div>
          </div>

          {/* Progress */}
          <div className="w-full max-w-2xl px-4 mb-4 md:mb-5">
             <StyledProgressBar progress={progress} duration={duration} onSeek={onSeek} className="mb-2" />
             <div className="flex justify-between text-[11px] font-bold text-muted-foreground/70 tabular-nums tracking-widest">
                <span>{formatTime(progress)}</span>
                <span>-{formatTime(Math.max(0, duration - progress))}</span>
             </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-7">
             <button onClick={onToggleShuffle} className={cn("p-2.5 rounded-2xl transition-all active:scale-90", shuffleMode ? "text-primary bg-primary/15 shadow-[0_0_15px_hsl(var(--primary)/0.3)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                <Shuffle className="w-5 h-5" />
             </button>
             
             <button onClick={onPrevious} className="p-3 rounded-full hover:bg-white/10 transition-all active:scale-75 text-foreground">
                <SkipBack className="w-6 h-6 fill-current" />
             </button>
             
             <button 
               onClick={onPlayPause} 
               className={cn(
                 "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 relative",
                 "bg-primary text-primary-foreground",
                 "shadow-[0_15px_40px_hsl(var(--primary)/0.4),0_0_60px_hsl(var(--primary)/0.2)]",
                 "hover:scale-105 hover:shadow-[0_20px_50px_hsl(var(--primary)/0.5),0_0_80px_hsl(var(--primary)/0.3)]"
               )}
             >
                {isPlaying ? <Pause className="w-7 h-7 md:w-8 md:h-8 fill-current" /> : <Play className="w-7 h-7 md:w-8 md:h-8 fill-current ml-1" />}
             </button>

             <button onClick={onNext} className="p-3 rounded-full hover:bg-white/10 transition-all active:scale-75 text-foreground">
                <SkipForward className="w-6 h-6 fill-current" />
             </button>

             <button onClick={onCycleLoopMode} className={cn("p-2.5 rounded-2xl transition-all active:scale-90", loopMode !== 'off' ? "text-primary bg-primary/15 shadow-[0_0_15px_hsl(var(--primary)/0.3)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                {loopMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
             </button>
          </div>

          {/* Bottom Quick Actions */}
          <div className="mt-4 md:mt-5 flex items-center gap-1.5 p-1.5 rounded-2xl glass-premium border border-white/10 backdrop-blur-2xl">
             <button 
               onClick={() => audioRef?.current && (audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.1))} 
               className="w-10 h-10 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center active:scale-90"
               aria-label="Volume down"
             >
                <Minus className="w-4 h-4" />
             </button>
             <button 
               onClick={() => audioRef?.current && (audioRef.current.muted = !audioRef.current.muted)} 
               className="w-10 h-10 rounded-xl hover:bg-white/10 text-primary transition-all flex items-center justify-center active:scale-90"
               aria-label="Mute"
             >
                <Volume2 className="w-5 h-5" />
             </button>
             <button 
               onClick={() => audioRef?.current && (audioRef.current.volume = Math.min(1, audioRef.current.volume + 0.1))} 
               className="w-10 h-10 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center active:scale-90"
               aria-label="Volume up"
             >
                <Plus className="w-4 h-4" />
             </button>
             <div className="w-px h-6 bg-white/10 mx-1" />
             <button 
               onClick={() => setShowEQ(!showEQ)} 
               className={cn(
                 "w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-90",
                 showEQ ? "bg-primary text-primary-foreground" : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
               )}
               aria-label="Equalizer"
             >
                 <SlidersHorizontal className="w-4 h-4" />
             </button>
             <button 
               onClick={handleShare} 
               className="w-10 h-10 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center active:scale-90"
               aria-label="Share"
             >
                 <Share2 className="w-4 h-4" />
             </button>
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

