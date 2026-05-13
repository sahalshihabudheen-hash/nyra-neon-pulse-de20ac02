import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Repeat, Shuffle, ListPlus, Check, Minus, Plus, Maximize2, Music2, SlidersHorizontal, Download, Loader2, Share2, Zap, Headphones, MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';
import SoundwaveVisualizer from './SoundwaveVisualizer';
import { cn } from '@/lib/utils';
import StyledProgressBar from './StyledProgressBar';
import PlaylistDrawer from './PlaylistDrawer';
import FullscreenPlayer from './FullscreenPlayer';
import LyricsDrawer from './LyricsDrawer';
import EqualizerPanel from './EqualizerPanel';
import NowPlayingPanel from './NowPlayingPanel';
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
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
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
  const { updateSettings } = useTheme();

  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Auto-mini player logic - triggers when playing starts or track changes
  useEffect(() => {
    if (isPlaying && settings.autoMiniPlayer && !isMiniMode) {
      updateSettings({ miniPlayerMode: true });
    }
    
    // Auto-open the Now Playing panel (video/artist) when first playing
    if (isPlaying && !hasAutoOpened && !nowPlayingOpen) {
      setNowPlayingOpen(true);
      setHasAutoOpened(true);
    }
  }, [isPlaying, currentTrack?.id, settings.autoMiniPlayer, isMiniMode, updateSettings, hasAutoOpened, nowPlayingOpen]);

  return (
    <>
      <footer className={cn(
        'fixed bottom-4 left-4 md:left-[272px] transition-all duration-700 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group/player glass-premium border border-white/10 z-40',
        isMiniMode ? 'h-20' : 'h-auto py-2 md:py-3',
        nowPlayingOpen ? 'right-[340px] md:right-[360px]' : 'right-4'
      )}>
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-50 group-hover/player:opacity-100 transition-opacity" />
        
        <div className={cn(
          'h-full px-4 md:px-6 flex items-center transition-all duration-500',
          isMiniMode ? 'gap-3' : 'flex-col gap-2 md:flex-row md:gap-6'
        )}>
          <div 
            className={cn(
              'flex items-center gap-3 cursor-pointer group/track transition-all duration-500',
              isMiniMode ? 'flex-1' : 'w-full md:w-80'
            )}
            onClick={() => currentTrack && setIsFullscreen(true)}
          >
            {currentTrack ? (
              <>
                <div className="relative shrink-0">
                  <div className={cn(
                    "absolute -inset-1.5 rounded-xl bg-primary/30 blur-md transition-all duration-1000",
                    isPlaying ? "opacity-100 scale-110 glow-pulse" : "opacity-0 scale-100"
                  )} />
                  <img
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className={cn(
                      'relative rounded-lg object-cover flex-shrink-0 transition-all duration-500 group-hover/track:scale-105 shadow-lg',
                      isMiniMode ? 'w-12 h-12' : 'w-14 h-14'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'font-bold text-foreground truncate group-hover/track:text-primary transition-colors tracking-tight',
                    isMiniMode ? 'text-xs' : 'text-base'
                  )}>
                    {currentTrack.title}
                  </h3>
                  <p className={cn(
                    "font-bold text-muted-foreground/60 truncate uppercase tracking-widest transition-all",
                    isMiniMode ? "text-[8px]" : "text-[11px]"
                  )}>{currentTrack.channel}</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  <Music2 className="w-5 h-5 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-medium text-xs">Pick a vibe</p>
              </div>
            )}
          </div>
          {/* Controls Center */}
          <div className={cn(
            'flex flex-col items-center gap-1.5',
            isMiniMode ? 'flex-1 max-w-md' : 'flex-1 w-full'
          )}>
            <div className={cn("flex items-center", isMiniMode ? "gap-4" : "gap-4 md:gap-6")}>
              <button onClick={onPrevious} className={cn("text-foreground hover:text-primary transition-all duration-300 active:scale-75", isMiniMode && "hidden sm:block")}>
                <SkipBack className={isMiniMode ? "w-4 h-4 fill-current" : "w-6 h-6 fill-current"} />
              </button>
              
              <button
                onClick={onPlayPause}
                className={cn(
                  'rounded-2xl flex items-center justify-center transition-all duration-500 active:scale-90 relative group/btn overflow-hidden shadow-[0_10px_20px_rgba(var(--primary),0.3)]',
                  isMiniMode ? 'w-10 h-10' : 'w-14 h-14',
                )}
                style={{ background: isPlaying ? 'var(--theme-gradient, hsl(var(--primary)))' : 'hsl(var(--primary))' }}
              >
                <div className="relative text-primary-foreground">
                  {isPlaying ? <Pause className={isMiniMode ? "w-4 h-4 fill-current" : "w-6 h-6 fill-current"} /> : <Play className={isMiniMode ? "w-4 h-4 fill-current ml-0.5" : "w-6 h-6 fill-current ml-1"} />}
                </div>
              </button>

              <button onClick={onNext} className={cn("text-foreground hover:text-primary transition-all duration-300 active:scale-75", isMiniMode && "hidden sm:block")}>
                <SkipForward className={isMiniMode ? "w-4 h-4 fill-current" : "w-6 h-6 fill-current"} />
              </button>
            </div>

            {/* Soundwave in Mini Mode */}
            {isMiniMode && isPlaying && (
              <div className="w-24 h-3 opacity-60 overflow-hidden">
                <SoundwaveVisualizer isPlaying={isPlaying} className="w-full h-full" />
              </div>
            )}

            {!isMiniMode && (
              <div className="w-full max-w-md h-6 mb-[-4px] animate-in-fade opacity-80 overflow-hidden">
                <SoundwaveVisualizer isPlaying={isPlaying} className="w-full h-full" />
              </div>
            )}

            <div className={cn(
              "w-full flex items-center gap-4 group/progress",
              isMiniMode ? "max-w-xs" : "max-w-2xl"
            )}>
              <span className={cn("font-bold text-muted-foreground tabular-nums text-right", isMiniMode ? "text-[8px] w-6" : "text-[10px] w-10")}>{formatTime(progress)}</span>
              <StyledProgressBar
                progress={progress}
                duration={duration}
                onSeek={handleSeek}
                className="flex-1"
                size={isMiniMode ? "sm" : "md"}
              />
              <span className={cn("font-bold text-muted-foreground tabular-nums", isMiniMode ? "text-[8px] w-6" : "text-[10px] w-10")}>{formatTime(duration)}</span>
            </div>
          </div>

          <div className={cn(
            'flex items-center justify-end transition-all duration-500',
            isMiniMode ? 'gap-2' : 'gap-2 w-80'
          )}>
            {currentTrack && (
               <div className={cn(
                 "flex items-center rounded-2xl bg-white/5 border border-white/5 transition-all",
                 isMiniMode ? "p-1 gap-1" : "p-1.5 gap-1.5 mr-2"
               )}>
                 <button onClick={() => setLyricsOpen(!lyricsOpen)} className={cn("rounded-xl transition-all", isMiniMode ? "p-1.5" : "p-2", lyricsOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")} title="Lyrics">
                    <Music2 className={isMiniMode ? "w-3.5 h-3.5" : "w-4 h-4"} />
                 </button>
                 <button onClick={() => setNowPlayingOpen(!nowPlayingOpen)} className={cn("rounded-xl transition-all", isMiniMode ? "p-1.5" : "p-2", nowPlayingOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")} title="Now Playing View">
                    <MonitorPlay className={isMiniMode ? "w-3.5 h-3.5" : "w-4 h-4"} />
                 </button>
                 <button onClick={() => setShowEQ(!showEQ)} className={cn("rounded-xl transition-all", isMiniMode ? "p-1.5" : "p-2", showEQ ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")} title="Equalizer">
                    <SlidersHorizontal className={isMiniMode ? "w-3.5 h-3.5" : "w-4 h-4"} />
                 </button>
               </div>
            )}

            <div className={cn("flex items-center", isMiniMode ? "gap-2" : "gap-3")}>
              <button onClick={toggleMute} className={cn("text-muted-foreground hover:text-primary transition-colors", isMiniMode ? "hidden sm:block" : "block")}>
                {getVolumeIcon()}
              </button>
              <div className={cn("relative h-1 group/vol", isMiniMode ? "w-12 hidden lg:block" : "w-20")}>
                <div className="absolute inset-0 rounded-full bg-white/10" />
                <div className="absolute left-0 top-0 h-full rounded-full bg-primary" style={{ width: `${isMuted ? 0 : volume}%` }} />
                <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              {currentTrack && <DownloadButton track={currentTrack} />}
            </div>
          </div>
        </div>

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
      <NowPlayingPanel 
        isOpen={nowPlayingOpen} 
        onClose={() => setNowPlayingOpen(false)} 
        currentTrack={currentTrack} 
        nextTrack={nextUpTrack} 
      />
    </>
  );
};

export default MusicPlayer;