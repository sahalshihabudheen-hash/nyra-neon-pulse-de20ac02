import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Repeat, Shuffle, ListPlus, Check, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import SoundwaveVisualizer from './SoundwaveVisualizer';
import PlaylistDrawer from './PlaylistDrawer';
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
  ytPlayerRef?: React.MutableRefObject<any>;
  shuffleMode?: boolean;
  onToggleShuffle?: () => void;
  queue?: Track[];
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
  ytPlayerRef,
  shuffleMode = false,
  onToggleShuffle,
  queue = [],
}: MusicPlayerProps) => {
  const { settings } = useTheme();
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update progress from YouTube player
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    if (isPlaying && ytPlayerRef?.current && !isDragging) {
      progressIntervalRef.current = setInterval(() => {
        try {
          const currentTime = ytPlayerRef.current.getCurrentTime?.() || 0;
          const totalDuration = ytPlayerRef.current.getDuration?.() || 0;
          setProgress(currentTime);
          setDuration(totalDuration);
        } catch (e) {
          // Player not ready
        }
      }, 250);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, ytPlayerRef, isDragging]);

  // Reset progress when track changes
  useEffect(() => {
    setProgress(0);
    setDuration(0);
  }, [currentTrack?.id]);

  // Sync volume with YouTube player
  useEffect(() => {
    if (ytPlayerRef?.current) {
      try {
        const actualVolume = isMuted ? 0 : volume;
        ytPlayerRef.current.setVolume?.(actualVolume);
      } catch (e) {
        // Player not ready
      }
    }
  }, [volume, isMuted, ytPlayerRef]);

  const handleSeek = useCallback((value: number) => {
    setProgress(value);
    if (ytPlayerRef?.current) {
      try {
        ytPlayerRef.current.seekTo?.(value, true);
      } catch (e) {
        console.error('Seek error:', e);
      }
    }
  }, [ytPlayerRef]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setProgress(value);
    // Immediate seek on touch/change
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

  return (
    <footer className={cn(
      'fixed bottom-0 left-0 md:left-64 right-0 glass-dark border-t border-border z-40 transition-all',
      isMiniMode ? 'h-16' : 'h-auto md:h-28'
    )}>
      <div className={cn(
        'h-full px-4 md:px-6 flex items-center',
        isMiniMode ? 'gap-4' : 'flex-col md:flex-row gap-4 md:gap-6 py-3 md:py-0'
      )}>
        {/* Track Info */}
        <div className={cn(
          'flex items-center gap-3 md:gap-4',
          isMiniMode ? 'flex-1' : 'w-full md:w-72'
        )}>
          {currentTrack ? (
            <>
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className={cn(
                  'rounded-lg object-cover',
                  isMiniMode ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-medium text-foreground truncate',
                  isMiniMode ? 'text-sm' : 'text-sm md:text-base'
                )}>
                  {currentTrack.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.channel}</p>
                {/* Soundwave below track name on mobile (non-mini mode) */}
                {!isMiniMode && settings.soundwaveEnabled && (
                  <div className="block md:hidden mt-1">
                    <SoundwaveVisualizer isPlaying={isPlaying} className="h-4" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 md:gap-4">
              <div className={cn(
                'rounded-lg bg-secondary flex items-center justify-center',
                isMiniMode ? 'w-10 h-10' : 'w-12 h-12 md:w-14 md:h-14'
              )}>
                <span className="text-muted-foreground text-xl">♪</span>
              </div>
              <p className="text-muted-foreground text-sm">No track selected</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={cn(
          'flex flex-col items-center gap-2',
          isMiniMode ? '' : 'flex-1 w-full md:w-auto'
        )}>
          <div className="flex items-center gap-3 md:gap-4">
            {!isMiniMode && (
              <button 
                onClick={onToggleShuffle}
                className={cn(
                  'w-8 h-8 flex items-center justify-center transition-colors rounded-full active:scale-95',
                  shuffleMode ? 'text-primary bg-primary/20' : 'text-muted-foreground hover:text-primary'
                )}
                title={shuffleMode ? 'Shuffle On' : 'Shuffle Off'}
              >
                <Shuffle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onPrevious}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors active:scale-95"
            >
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </button>
            
            {/* Add to Playlist Button */}
            {!isMiniMode && currentTrack && onAddToPlaylist && (
              <button
                onClick={handleAddToPlaylist}
                className={cn(
                  'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all active:scale-95',
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
                'rounded-full flex items-center justify-center transition-all active:scale-95',
                isMiniMode ? 'w-10 h-10' : 'w-12 h-12',
                isPlaying
                  ? 'bg-primary text-primary-foreground neon-glow'
                  : 'bg-primary text-primary-foreground hover:neon-glow'
              )}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
              )}
            </button>
            <button
              onClick={onNext}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors active:scale-95"
            >
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>
            {!isMiniMode && (
              <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors active:scale-95 rounded-full">
                <Repeat className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {!isMiniMode && (
            <div className="w-full max-w-xl flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(progress)}
              </span>
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
                className="flex-1 cursor-pointer touch-none"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${(progress / (duration || 100)) * 100}%, hsl(0 0% 25%) ${(progress / (duration || 100)) * 100}%)`
                }}
              />
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>
          )}
        </div>

        {/* Volume, Soundwave & Playlist */}
        <div className={cn(
          'items-center gap-4 justify-end',
          isMiniMode ? 'hidden md:flex' : 'hidden md:flex w-72'
        )}>
          {/* Desktop Soundwave Visualizer */}
          {settings.soundwaveEnabled && !isMiniMode && (
            <SoundwaveVisualizer isPlaying={isPlaying} className="h-6" />
          )}

          {/* Playlist Drawer Trigger */}
          {!isMiniMode && (
            <PlaylistDrawer
              playlist={playlist}
              currentTrack={currentTrack}
              onPlayTrack={onPlayFromPlaylist || (() => {})}
              onRemoveTrack={onRemoveFromPlaylist || (() => {})}
              onClearPlaylist={onClearPlaylist || (() => {})}
              isOpen={playlistOpen}
              onOpenChange={setPlaylistOpen}
              isPlaying={isPlaying}
            />
          )}

          {/* Volume Control */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleVolumeDown}
              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-secondary active:scale-95"
              title="Volume Down"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={toggleMute}
              className="text-muted-foreground hover:text-primary transition-colors active:scale-95"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {getVolumeIcon()}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 touch-none"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${isMuted ? 0 : volume}%, hsl(0 0% 25%) ${isMuted ? 0 : volume}%)`
              }}
            />
            <button
              onClick={handleVolumeUp}
              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-secondary active:scale-95"
              title="Volume Up"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="text-xs text-muted-foreground w-8 text-center">
              {isMuted ? 0 : volume}%
            </span>
          </div>
        </div>

        {/* Mobile Bottom Row */}
        {!isMiniMode && (
          <div className="flex md:hidden items-center justify-between w-full px-2">
            {/* Mobile Playlist Button */}
            <PlaylistDrawer
              playlist={playlist}
              currentTrack={currentTrack}
              onPlayTrack={onPlayFromPlaylist || (() => {})}
              onRemoveTrack={onRemoveFromPlaylist || (() => {})}
              onClearPlaylist={onClearPlaylist || (() => {})}
              isOpen={playlistOpen}
              onOpenChange={setPlaylistOpen}
              isPlaying={isPlaying}
            />

            {/* Mobile Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleVolumeDown}
                className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors active:scale-95"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={toggleMute}
                className="text-muted-foreground hover:text-primary transition-colors active:scale-95"
              >
                {getVolumeIcon()}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 touch-none"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${isMuted ? 0 : volume}%, hsl(0 0% 25%) ${isMuted ? 0 : volume}%)`
                }}
              />
              <button
                onClick={handleVolumeUp}
                className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors active:scale-95"
              >
                <Plus className="w-3 h-3" />
              </button>
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
  );
};

export default MusicPlayer;
