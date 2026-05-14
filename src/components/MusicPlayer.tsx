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
    <button 
      onClick={() => startDownload(track)} 
      className={cn(
        "p-2 rounded-xl transition-all",
        loading ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )} 
      title="Download"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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
  const { 
    settings,
    updateSettings 
  } = useTheme();

  const {
    currentTrack: ctxCurrentTrack,
    isPlaying: ctxIsPlaying,
    handlePlayPause: ctxOnPlayPause,
    handleNext: ctxOnNext,
    handlePrevious: ctxOnPrevious,
    handlePlayFromPlaylist,
    handlePlayFromQueue,
    handleAddToPlaylist,
    handleAddToQueue,
    handleRemoveFromPlaylist,
    handleClearPlaylist,
    playlist: ctxPlaylist,
    queue: ctxQueue,
    isInPlaylist: ctxIsInPlaylist,
    removeFromQueue,
    reorderPlaylist,
    shuffleMode: ctxShuffleMode,
    toggleShuffle,
    loopMode: ctxLoopMode,
    cycleLoopMode,
    isFavorite,
    toggleFavorite,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
  } = useMusicPlayer();

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
    if (ctxQueue.length > 0) return ctxQueue[0];
    if (currentTrack && ctxPlaylist.length > 0) {
      const idx = ctxPlaylist.findIndex(t => t.id === currentTrack.id);
      if (idx !== -1 && idx < ctxPlaylist.length - 1) return ctxPlaylist[idx + 1];
      if (idx !== -1 && ctxLoopMode === 'all') return ctxPlaylist[0];
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
        'fixed bottom-6 left-6 md:left-[272px] transition-all duration-700 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden group/player glass-premium border border-white/10 z-40',
        nowPlayingOpen ? 'right-[380px]' : 'right-6',
        'h-[180px] py-6 px-8'
      )}>
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-50 group-hover/player:opacity-100 transition-opacity" />
        
        <div className="h-full grid grid-rows-[1fr_auto] gap-4 relative z-10">
          <div className="flex items-center justify-between gap-8">
            {/* Left: Track Info */}
            <div 
              className="flex items-center gap-3 cursor-pointer group/track min-w-0 md:w-80"
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
                      className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl object-cover shadow-2xl transition-transform duration-500 group-hover/track:scale-105"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs md:text-sm font-black text-foreground truncate group-hover/track:text-primary transition-colors tracking-tight">
                      {currentTrack.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <p className="text-[8px] md:text-[10px] font-black text-muted-foreground/60 truncate uppercase tracking-widest mt-0.5">
                        {currentTrack.channel}
                      </p>
                      {/* Soundwave moved here to prevent center jumbling */}
                      <div className="hidden lg:block w-12 h-3 opacity-40 pointer-events-none">
                        <SoundwaveVisualizer isPlaying={isPlaying} className="w-full h-full" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4 opacity-40">
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/5" />
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-white/10 rounded-full" />
                    <div className="h-2 w-16 bg-white/5 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Center: Controls */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex items-center gap-4 md:gap-8">
                <button 
                  onClick={onPrevious}
                  className="text-muted-foreground hover:text-foreground transition-all active:scale-90"
                >
                  <SkipBack className="w-4 h-4 md:w-6 md:h-6 fill-current" />
                </button>
                <button
                  onClick={onPlayPause}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.4)] hover:scale-110 active:scale-95 transition-all neon-glow"
                >
                  {isPlaying ? <Pause className="w-6 h-6 md:w-8 md:h-8 fill-current" /> : <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" />}
                </button>
                <button 
                  onClick={onNext}
                  className="text-muted-foreground hover:text-foreground transition-all active:scale-90"
                >
                  <SkipForward className="w-4 h-4 md:w-6 md:h-6 fill-current" />
                </button>
              </div>
            </div>

            {/* Right: Actions & Volume */}
            <div className="flex-1 flex items-center justify-end gap-2 md:gap-6">
              <div className="flex items-center gap-1 md:gap-2 p-1 md:p-1.5 rounded-xl md:rounded-2xl bg-white/5 border border-white/5">
                <button onClick={() => setLyricsOpen(!lyricsOpen)} className={cn("p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all", lyricsOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                  <Music2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button onClick={() => setNowPlayingOpen(!nowPlayingOpen)} className={cn("p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all", nowPlayingOpen ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                  <MonitorPlay className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
                <button onClick={() => setShowEQ(!showEQ)} className={cn("p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all hidden md:flex", showEQ ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-white/5")}>
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                {currentTrack && <div className="hidden sm:block"><DownloadButton track={currentTrack} /></div>}
              </div>

              <div className="hidden md:flex items-center gap-3 w-32 group/volume shrink-0">
                <button onClick={toggleMute} className="text-muted-foreground hover:text-primary transition-colors">
                  {getVolumeIcon()}
                </button>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary neon-glow-sm transition-all"
                    style={{ width: `${isMuted ? 0 : volume}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                  />
                </div>
              </div>
            </div>


          </div>

          {/* Bottom: Progress Bar */}
          <div className="w-full flex justify-center pb-2">
            <div className="w-full max-w-xl flex items-center gap-6 px-4">
              <span className="text-[10px] font-black text-muted-foreground tabular-nums w-10 text-right">{formatTime(progress)}</span>
              <StyledProgressBar
                progress={progress}
                duration={duration}
                onSeek={handleSeek}
                className="flex-1"
              />
              <span className="text-[10px] font-black text-muted-foreground tabular-nums w-10">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
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