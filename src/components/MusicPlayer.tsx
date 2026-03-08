import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Repeat, Shuffle, ListPlus, Check, Minus, Plus, Maximize2, Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SoundwaveVisualizer from './SoundwaveVisualizer';
import PlaylistDrawer from './PlaylistDrawer';
import FullscreenPlayer from './FullscreenPlayer';
import LyricsDrawer from './LyricsDrawer';
import { useTheme } from '@/contexts/ThemeContext';

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
  const progressRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get next up track
  const nextUpTrack = queue.length > 0 ? queue[0] : null;

  // Update progress from audio element or YouTube player
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (isPlaying && !isDragging) {
      progressIntervalRef.current = setInterval(() => {
        // Try audio element first
        if (audioRef?.current && audioRef.current.src && !isNaN(audioRef.current.duration)) {
          setProgress(audioRef.current.currentTime);
          setDuration(audioRef.current.duration);
          return;
        }
        // Fall back to YouTube player
        if (ytPlayerRef?.current) {
          try {
            const currentTime = ytPlayerRef.current.getCurrentTime?.() || 0;
            const totalDuration = ytPlayerRef.current.getDuration?.() || 0;
            setProgress(currentTime);
            setDuration(totalDuration);
          } catch (e) {
            // Player not ready
          }
        }
      }, 250);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, ytPlayerRef, audioRef, isDragging]);

  // Reset progress when track changes
  useEffect(() => {
    setProgress(0);
    setDuration(0);
  }, [currentTrack?.id]);

  // Sync volume with audio element and YouTube player
  useEffect(() => {
    const actualVolume = isMuted ? 0 : volume;
    
    if (audioRef?.current) {
      audioRef.current.volume = actualVolume / 100;
    }
    if (ytPlayerRef?.current) {
      try {
        ytPlayerRef.current.setVolume?.(actualVolume);
      } catch (e) {
        // Player not ready
      }
    }
  }, [volume, isMuted, ytPlayerRef, audioRef]);

  const handleSeek = useCallback((value: number) => {
    setProgress(value);
    // Try audio element first
    if (audioRef?.current && audioRef.current.src) {
      audioRef.current.currentTime = value;
      return;
    }
    // Fall back to YouTube
    if (ytPlayerRef?.current) {
      try {
        ytPlayerRef.current.seekTo?.(value, true);
      } catch (e) {
        console.error('Seek error:', e);
      }
    }
  }, [ytPlayerRef, audioRef]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setProgress(value);
    handleSeek(value);
  };

  const handleProgressMouseDown = () => {
    setIsDragging(true);
  };

  const handleProgressMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsDragging(false);
    const target = e.target as HTMLInputElement;
    handleSeek(Number(target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    setIsMuted(false);
  };

  const handleVolumeUp = () => {
    const newVolume = Math.min(100, volume + 10);
    setVolume(newVolume);
    setIsMuted(false);
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(0, volume - 10);
    setVolume(newVolume);
    if (newVolume === 0) setIsMuted(true);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleAddToPlaylist = () => {
    if (currentTrack && onAddToPlaylist) {
      onAddToPlaylist(currentTrack);
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 50) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  const isMiniMode = settings.miniPlayerMode;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <footer className={cn(
        'fixed bottom-0 left-0 md:left-64 right-0 glass-premium border-t border-primary/10 z-40 transition-all',
        isMiniMode ? 'h-16' : 'h-auto'
      )}>
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className={cn(
        'h-full px-3 md:px-4 flex items-center',
        isMiniMode ? 'gap-4' : 'flex-col gap-1 py-1.5 md:flex-row md:gap-4 md:py-2'
      )}>
        {/* Track Info - Clickable to open fullscreen */}
        <div 
          className={cn(
            'flex items-center gap-3 cursor-pointer group/track',
            isMiniMode ? 'flex-1' : 'w-full md:w-72'
          )}
          onClick={() => currentTrack && setIsFullscreen(true)}
        >
          {currentTrack ? (
            <>
              <div className="relative group">
                <div className={cn(
                  "absolute -inset-1 rounded-lg bg-primary/30 blur-sm transition-opacity",
                  isPlaying ? "opacity-100 glow-pulse" : "opacity-0"
                )} />
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className={cn(
                    'relative rounded-lg object-cover flex-shrink-0 transition-all group-hover/track:scale-105',
                    isMiniMode ? 'w-10 h-10' : 'w-11 h-11'
                  )}
                />
                {/* Fullscreen hint overlay */}
                <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover/track:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>
                {isPlaying && !isMiniMode && (
                  <div className="absolute bottom-1 right-1 flex gap-0.5 group-hover/track:opacity-0 transition-opacity">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-primary rounded-full equalizer-bar"
                        style={{ height: '8px' }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-semibold text-foreground truncate group-hover/track:text-primary transition-colors',
                  isMiniMode ? 'text-sm' : 'text-sm md:text-base'
                )}>
                  {currentTrack.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.channel}</p>
                {/* Next Up indicator - ALWAYS VISIBLE */}
                {!isMiniMode && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-sm">⏭️</span>
                    {nextUpTrack ? (
                      <p className="text-xs text-primary truncate font-medium">
                        Next: {nextUpTrack.title.slice(0, 25)}...
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 italic">
                        Queue empty
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className={cn(
                'rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 border border-border',
                isMiniMode ? 'w-10 h-10' : 'w-11 h-11'
              )}>
                <span className="text-muted-foreground text-2xl">♪</span>
              </div>
              <p className="text-muted-foreground text-sm">No track selected</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={cn(
          'flex flex-col items-center gap-1',
          isMiniMode ? '' : 'flex-1 w-full'
        )}>
          <div className="flex items-center gap-1 md:gap-3">
            {!isMiniMode && (
              <button 
                onClick={onToggleShuffle}
                className={cn(
                  'w-9 h-9 md:w-8 md:h-8 flex items-center justify-center transition-colors rounded-full active:scale-90 touch-manipulation',
                  shuffleMode ? 'text-primary bg-primary/20' : 'text-muted-foreground hover:text-primary'
                )}
                title={shuffleMode ? 'Shuffle On' : 'Shuffle Off'}
              >
                <Shuffle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onPrevious}
              className="w-10 h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors active:scale-90 touch-manipulation"
            >
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </button>
            
            {/* Add to Playlist Button */}
            {!isMiniMode && currentTrack && onAddToPlaylist && (
              <button
                onClick={handleAddToPlaylist}
                className={cn(
                  'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation',
                  isInPlaylist
                    ? 'bg-primary/20 text-primary border border-primary/50'
                    : 'bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/80'
                )}
                title={isInPlaylist ? 'Already in playlist' : 'Add to playlist'}
              >
                {isInPlaylist ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ListPlus className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              onClick={onPlayPause}
              className={cn(
                'rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation relative',
                isMiniMode ? 'w-10 h-10' : 'w-12 h-12',
              )}
              style={{
                background: isPlaying 
                  ? 'var(--theme-gradient, hsl(var(--primary)))' 
                  : 'hsl(var(--primary))'
              }}
            >
              {/* Glow ring when playing */}
              {isPlaying && (
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
              )}
              <div className={cn(
                'relative flex items-center justify-center text-primary-foreground',
                isPlaying && 'neon-glow rounded-full'
              )}>
                {isPlaying ? (
                  <Pause className={cn(isMiniMode ? 'w-4 h-4' : 'w-5 h-5')} fill="currentColor" />
                ) : (
                  <Play className={cn(isMiniMode ? 'w-4 h-4' : 'w-5 h-5', 'ml-0.5')} fill="currentColor" />
                )}
              </div>
            </button>
            <button
              onClick={onNext}
              className="w-10 h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors active:scale-90 touch-manipulation"
            >
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>
            {!isMiniMode && (
              <button className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors active:scale-90 rounded-full touch-manipulation">
                <Repeat className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar - ALWAYS VISIBLE */}
          {!isMiniMode && (
            <>
              <div className="w-full max-w-xl flex items-center gap-2 px-2">
                <span className="text-xs text-foreground/70 w-10 text-right tabular-nums font-mono">
                  {formatTime(progress)}
                </span>
                <div className="relative flex-1 h-2 group rounded-full bg-white/10 border border-white/20 overflow-hidden">
                  {/* Background track */}
                  <div className="absolute inset-0 bg-muted/30" />
                  {/* Progress fill */}
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <input
                    ref={progressRef}
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={progress}
                    onChange={handleProgressChange}
                    onMouseDown={handleProgressMouseDown}
                    onMouseUp={handleProgressMouseUp}
                    onTouchStart={handleProgressMouseDown}
                    onTouchEnd={handleProgressMouseUp}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
                  />
                  {/* Progress handle - always visible */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary shadow-lg border-2 border-white transition-all pointer-events-none"
                    style={{ left: `calc(${progressPercent}% - 7px)` }}
                  />
                </div>
                <span className="text-xs text-foreground/70 w-10 tabular-nums font-mono">
                  {formatTime(duration)}
                </span>
              </div>
              {settings.soundwaveEnabled && (
                <div className="hidden md:flex w-full justify-center">
                  <div className="bg-black/30 rounded-lg px-2 py-0.5 border border-primary/30">
                    <SoundwaveVisualizer isPlaying={isPlaying} className="h-4 w-24" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Controls (Desktop) */}
        <div className={cn(
          'flex items-center gap-2 justify-end',
          isMiniMode ? 'hidden md:flex' : 'hidden md:flex w-72'
        )}>
          {!isMiniMode && (
            <div className="flex items-center gap-1 mr-2">
              {/* Lyrics */}
              <button
                onClick={() => setLyricsOpen(!lyricsOpen)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation',
                  lyricsOpen
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-primary hover:bg-secondary'
                )}
                title="Lyrics"
              >
                <Music2 className="w-4 h-4" />
              </button>
              {/* Playlist */}
              <PlaylistDrawer
                playlist={playlist}
                currentTrack={currentTrack}
                onPlayTrack={onPlayFromPlaylist || (() => {})}
                onRemoveTrack={onRemoveFromPlaylist || (() => {})}
                onClearPlaylist={onClearPlaylist || (() => {})}
                isOpen={playlistOpen}
                onOpenChange={setPlaylistOpen}
                isPlaying={isPlaying}
                onReorderPlaylist={onReorderPlaylist}
              />
            </div>
          )}

          {/* Volume */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleVolumeDown}
              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-secondary active:scale-90 touch-manipulation"
              title="Volume Down"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={toggleMute}
              className="text-muted-foreground hover:text-primary transition-colors active:scale-90 touch-manipulation"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </button>
            <div className="relative w-16 h-2 group">
              <div className="absolute inset-0 rounded-full bg-secondary/50" />
              <div 
                className="absolute left-0 top-0 h-full rounded-full bg-primary"
                style={{ width: `${isMuted ? 0 : volume}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
              />
            </div>
            <button
              onClick={handleVolumeUp}
              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-secondary active:scale-90 touch-manipulation"
              title="Volume Up"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">
              {isMuted ? 0 : volume}%
            </span>
          </div>
        </div>

        {/* Mobile Bottom Row */}
        {!isMiniMode && (
          <div className="flex md:hidden items-center justify-between w-full px-2 gap-3">
            {/* Soundwave */}
            {settings.soundwaveEnabled && (
              <div className="bg-black/30 rounded-lg px-2 py-1 border border-primary/30 flex-shrink-0">
                <SoundwaveVisualizer isPlaying={isPlaying} className="h-6 w-20" />
              </div>
            )}

            {/* Lyrics + Playlist grouped */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLyricsOpen(!lyricsOpen)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation',
                  lyricsOpen
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-primary hover:bg-secondary'
                )}
                title="Lyrics"
              >
                <Music2 className="w-4 h-4" />
              </button>
              <PlaylistDrawer
                playlist={playlist}
                currentTrack={currentTrack}
                onPlayTrack={onPlayFromPlaylist || (() => {})}
                onRemoveTrack={onRemoveFromPlaylist || (() => {})}
                onClearPlaylist={onClearPlaylist || (() => {})}
                isOpen={playlistOpen}
                onOpenChange={setPlaylistOpen}
                isPlaying={isPlaying}
                onReorderPlaylist={onReorderPlaylist}
              />
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={toggleMute}
                className="text-muted-foreground hover:text-primary transition-colors active:scale-90 touch-manipulation"
              >
                {getVolumeIcon()}
              </button>
              <div className="relative w-16 h-2">
                <div className="absolute inset-0 rounded-full bg-secondary/50" />
                <div 
                  className="absolute left-0 top-0 h-full rounded-full bg-primary"
                  style={{ width: `${isMuted ? 0 : volume}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden YouTube Player Container */}
      <div 
        id="youtube-player-container"
        className="absolute -top-[1px] left-0 w-1 h-[1px] opacity-0 pointer-events-none overflow-hidden"
      />

      </footer>

      {/* Fullscreen Player (rendered outside footer stacking context) */}
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
        queue={queue}
        onRemoveFromQueue={onRemoveFromQueue}
        onPlayFromQueue={onPlayFromQueue}
        progress={progress}
        duration={duration}
        onSeek={handleSeek}
      />

      {/* Lyrics Drawer */}
      <LyricsDrawer isOpen={lyricsOpen} onClose={() => setLyricsOpen(false)} />
    </>
  );
};

export default MusicPlayer;