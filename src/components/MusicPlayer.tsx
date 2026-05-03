import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Repeat, Shuffle, ListPlus, Check, Minus, Plus, Maximize2, Music2, SlidersHorizontal, Download, Loader2, Share2, Zap, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import SoundwaveVisualizer from './SoundwaveVisualizer';
import { cn } from '@/lib/utils';
import StyledProgressBar from './StyledProgressBar';
import PlaylistDrawer from './PlaylistDrawer';
import FullscreenPlayer from './FullscreenPlayer';
import LyricsDrawer from './LyricsDrawer';
import EqualizerPanel from './EqualizerPanel';
import { useTheme } from '@/contexts/ThemeContext';
import { useDownloadManager } from '@/contexts/DownloadManagerContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

const DownloadButton = ({ track }: { track: { id: string; title: string; thumbnail: string } }) => {
  const { startDownload, isDownloading } = useDownloadManager();
  const loading = isDownloading(track.id);
  return (
    <button onClick={() => startDownload(track)} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300 rounded-xl hover:bg-white/5 active:scale-90" title="Download">
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Download className="w-4 h-4" />}
    </button>
  );
};

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface MusicPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onAddToPlaylist?: (track: Track) => void;
  isInPlaylist?: boolean;
  playlist?: Track[];
  onPlayFromPlaylist?: (track: Track) => void;
  onRemoveFromPlaylist?: (trackId: string) => void;
  onClearPlaylist?: () => void;
  onReorderPlaylist?: (startIndex: number, endIndex: number) => void;
  ytPlayerRef?: React.MutableRefObject<any>;
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
  shuffleMode?: boolean;
  onToggleShuffle?: () => void;
  loopMode?: 'off' | 'all' | 'one';
  onCycleLoopMode?: () => void;
  queue?: Track[];
  onRemoveFromQueue?: (trackId: string) => void;
  onPlayFromQueue?: (track: Track) => void;
}

const MusicPlayer = ({
  currentTrack,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onAddToPlaylist,
  isInPlaylist = false,
  playlist = [],
  onPlayFromPlaylist,
  onRemoveFromPlaylist,
  onClearPlaylist,
  onReorderPlaylist,
  ytPlayerRef,
  audioRef,
  shuffleMode = false,
  onToggleShuffle,
  loopMode = 'off',
  onCycleLoopMode,
  queue = [],
  onRemoveFromQueue,
  onPlayFromQueue,
}: MusicPlayerProps) => {
  const { settings } = useTheme();
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const progressRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const nextUpTrack = (() => {
    if (queue.length > 0) return queue[0];
    if (currentTrack && playlist.length > 0) {
      const idx = playlist.findIndex(t => t.id === currentTrack.id);
      if (idx !== -1 && idx < playlist.length - 1) return playlist[idx + 1];
      if (idx !== -1 && loopMode === 'all') return playlist[0];
    }
    return null;
  })();

  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (isPlaying && !isDragging) {
      progressIntervalRef.current = setInterval(() => {
        if (audioRef?.current && audioRef.current.src && !isNaN(audioRef.current.duration)) {
          setProgress(audioRef.current.currentTime);
          setDuration(audioRef.current.duration);
          return;
        }
        if (ytPlayerRef?.current) {
          try {
            const currentTime = ytPlayerRef.current.getCurrentTime?.() || 0;
            const totalDuration = ytPlayerRef.current.getDuration?.() || 0;
            setProgress(currentTime);
            setDuration(totalDuration);
          } catch (e) {}
        }
      }, 250);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, ytPlayerRef, audioRef, isDragging]);

  useEffect(() => {
    setProgress(0);
    setDuration(0);
  }, [currentTrack?.id]);

  useEffect(() => {
    const actualVolume = isMuted ? 0 : volume;
    if (audioRef?.current) {
      audioRef.current.volume = actualVolume / 100;
    }
    if (ytPlayerRef?.current) {
      try {
        ytPlayerRef.current.setVolume?.(actualVolume);
      } catch (e) {}
    }
  }, [volume, isMuted, ytPlayerRef, audioRef]);

  const handleSeek = useCallback((value: number) => {
    setProgress(value);
    if (audioRef?.current && audioRef.current.src) {
      audioRef.current.currentTime = value;
      return;
    }
    if (ytPlayerRef?.current) {
      try {
        ytPlayerRef.current.seekTo?.(value, true);
      } catch (e) {}
    }
  }, [ytPlayerRef, audioRef]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleShare = () => {
    if (currentTrack) {
      const shareUrl = `${window.location.origin}/api/og?id=${currentTrack.id}&title=${encodeURIComponent(currentTrack.title)}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied!', {
        icon: <Share2 className="w-4 h-4 text-primary" />,
      });
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 50) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  const isMiniMode = settings.miniPlayerMode;

  return (
    <>
      <footer className={cn(
        'fixed bottom-4 left-4 md:left-[272px] right-4 glass-premium border border-white/10 z-40 transition-all duration-700 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group/player',
        isMiniMode ? 'h-16' : 'h-auto py-2 md:py-3'
      )}>
        {/* Animated Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-50 group-hover/player:opacity-100 transition-opacity" />
        
        <div className={cn(
          'h-full px-4 md:px-6 flex items-center',
          isMiniMode ? 'gap-4' : 'flex-col gap-2 md:flex-row md:gap-6'
        )}>
          {/* Track Info */}
          <div 
            className={cn(
              'flex items-center gap-4 cursor-pointer group/track',
              isMiniMode ? 'flex-1' : 'w-full md:w-80'
            )}
            onClick={() => currentTrack && setIsFullscreen(true)}
          >
            {currentTrack ? (
              <>
                <div className="relative">
                  <div className={cn(
                    "absolute -inset-1.5 rounded-xl bg-primary/30 blur-md transition-all duration-1000",
                    isPlaying ? "opacity-100 scale-110 glow-pulse" : "opacity-0 scale-100"
                  )} />
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className={cn(
                      'relative rounded-xl object-cover flex-shrink-0 transition-transform duration-500 group-hover/track:scale-105 shadow-lg',
                      isMiniMode ? 'w-10 h-10' : 'w-14 h-14'
                    )}
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/track:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'font-bold text-foreground truncate group-hover/track:text-primary transition-colors tracking-tight',
                    isMiniMode ? 'text-sm' : 'text-base'
                  )}>
                    {currentTrack.title}
                  </h3>
                  <p className="text-[11px] font-bold text-muted-foreground/60 truncate uppercase tracking-widest">{currentTrack.channel}</p>
                  {!isMiniMode && (
                    <div className="flex items-center gap-2 mt-1.5 opacity-60 group-hover/track:opacity-100 transition-opacity">
                      <Zap className="w-3 h-3 text-primary animate-pulse" />
                      <span className="text-[10px] font-bold text-primary/80 uppercase">High Fidelity Audio</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  <Music2 className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-medium text-sm">Pick a vibe to start</p>
              </div>
            )}

            {!isMiniMode && currentTrack && (
              <div className="hidden md:flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleShare} className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-primary transition-all rounded-xl hover:bg-white/5">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Controls Center */}
          <div className={cn(
            'flex flex-col items-center gap-2',
            isMiniMode ? '' : 'flex-1 w-full'
          )}>
            <div className="flex items-center gap-4 md:gap-6">
              <button onClick={onPrevious} className="text-foreground hover:text-primary transition-all duration-300 active:scale-75">
                <SkipBack className="w-6 h-6 fill-current" />
              </button>
              
              <button
                onClick={onPlayPause}
                className={cn(
                  'rounded-2xl flex items-center justify-center transition-all duration-500 active:scale-90 relative group/btn overflow-hidden',
                  isMiniMode ? 'w-10 h-10' : 'w-14 h-14 shadow-[0_10px_20px_rgba(var(--primary),0.3)]',
                )}
                style={{ background: isPlaying ? 'var(--theme-gradient, hsl(var(--primary)))' : 'hsl(var(--primary))' }}
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                <div className="relative text-primary-foreground">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </div>
              </button>

              <button onClick={onNext} className="text-foreground hover:text-primary transition-all duration-300 active:scale-75">
                <SkipForward className="w-6 h-6 fill-current" />
              </button>
            </div>

            {!isMiniMode && (
              <div className="w-full max-w-md h-6 mb-[-4px] animate-in-fade opacity-80 overflow-hidden">
                <SoundwaveVisualizer isPlaying={isPlaying} className="w-full h-full" />
              </div>
            )}

            {!isMiniMode && (
              <div className="w-full max-w-2xl flex items-center gap-4 group/progress">
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-10 text-right">{formatTime(progress)}</span>
                <StyledProgressBar
                  progress={progress}
                  duration={duration}
                  onSeek={handleSeek}
                  className="flex-1"
                />
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-10">{formatTime(duration)}</span>
              </div>
            )}
          </div>

          {/* Up Next Preview (Cute) */}
          {!isMiniMode && isPlaying && nextUpTrack && (
            <div className="hidden md:flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group/next cursor-pointer animate-in-scale shrink-0 max-w-[220px]">
              <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-lg">
                <img 
                  src={nextUpTrack.thumbnail} 
                  alt="Next Up" 
                  className="w-full h-full object-cover group-hover/next:scale-110 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/20 group-hover/next:bg-black/0 transition-colors" />
              </div>
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-0.5 opacity-80 group-hover/next:opacity-100 transition-opacity flex items-center gap-1">
                   Up Next <Zap className="w-2.5 h-2.5 fill-current" />
                </span>
                <p className="text-[11px] font-bold text-foreground truncate group-hover/next:text-primary transition-colors">
                  {nextUpTrack.title}
                </p>
              </div>
            </div>
          )}

          {/* Side Actions (Desktop) */}
          <div className={cn(
            'flex items-center gap-2 justify-end',
            isMiniMode ? 'hidden md:flex' : 'hidden md:flex w-80'
          )}>
            {currentTrack && (
               <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/5 border border-white/5 mr-2">


                 <button onClick={() => setLyricsOpen(!lyricsOpen)} className={cn("p-2 rounded-xl transition-all", lyricsOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                    <Music2 className="w-4 h-4" />
                 </button>
                 <button onClick={() => setShowEQ(!showEQ)} className={cn("p-2 rounded-xl transition-all", showEQ ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                    <SlidersHorizontal className="w-4 h-4" />
                 </button>
               </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={toggleMute} className="text-muted-foreground hover:text-primary transition-colors">
                {getVolumeIcon()}
              </button>
              <div className="relative w-20 h-1.5 group/vol">
                <div className="absolute inset-0 rounded-full bg-white/10" />
                <div className="absolute left-0 top-0 h-full rounded-full bg-primary" style={{ width: `${isMuted ? 0 : volume}%` }} />
                <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              {currentTrack && <DownloadButton track={currentTrack} />}
            </div>
          </div>
        </div>

        {/* Floating EQ Panel */}
        {showEQ && audioRef && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-80 z-50 animate-in-up">
            <div className="glass-premium border border-white/10 p-6 rounded-[2rem] shadow-2xl">
               <EqualizerPanel audioRef={audioRef} isOpen={showEQ} onClose={() => setShowEQ(false)} />
            </div>
          </div>
        )}
      </footer>

      <FullscreenPlayer
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        onNext={onNext}
        onPrevious={onPrevious}
        shuffleMode={shuffleMode}
        onToggleShuffle={onToggleShuffle}
        loopMode={loopMode}
        onCycleLoopMode={onCycleLoopMode}
        queue={queue}
        onRemoveFromQueue={onRemoveFromQueue}
        onPlayFromQueue={onPlayFromQueue}
        progress={progress}
        duration={duration}
        onSeek={handleSeek}
        audioRef={audioRef}
      />

      <LyricsDrawer isOpen={lyricsOpen} onClose={() => setLyricsOpen(false)} />


    </>
  );
};

export default MusicPlayer;