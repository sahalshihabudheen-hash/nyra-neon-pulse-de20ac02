import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, ListPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import SoundwaveVisualizer from './SoundwaveVisualizer';
import PlaylistDrawer from './PlaylistDrawer';

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
}: MusicPlayerProps) => {
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration] = useState(240);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= duration ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  useEffect(() => {
    setProgress(0);
  }, [currentTrack?.id]);

  const handleAddToPlaylist = () => {
    if (currentTrack && onAddToPlaylist) {
      onAddToPlaylist(currentTrack);
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 md:left-64 right-0 h-auto md:h-24 glass-dark border-t border-border z-40">
      <div className="h-full px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row items-center gap-4 md:gap-6">
        {/* Track Info */}
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-72">
          {currentTrack ? (
            <>
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-12 h-12 md:w-14 md:h-14 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate text-sm md:text-base">{currentTrack.title}</p>
                <p className="text-xs md:text-sm text-muted-foreground truncate">{currentTrack.channel}</p>
                {/* Soundwave below track name on mobile */}
                <div className="block md:hidden mt-1">
                  <SoundwaveVisualizer isPlaying={isPlaying} className="h-4" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-muted-foreground text-xl">♪</span>
              </div>
              <p className="text-muted-foreground text-sm md:text-base">No track selected</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-3 md:gap-4">
            <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={onPrevious}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors"
            >
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </button>
            
            {/* Add to Playlist Button */}
            {currentTrack && onAddToPlaylist && (
              <button
                onClick={handleAddToPlaylist}
                className={cn(
                  'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all',
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
                'w-12 h-12 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all',
                isPlaying
                  ? 'bg-primary text-primary-foreground neon-glow'
                  : 'bg-foreground text-background hover:bg-primary hover:text-primary-foreground'
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
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-foreground hover:text-primary transition-colors"
            >
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-xl flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(progress)}
            </span>
            <input
              type="range"
              min="0"
              max={duration}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume, Soundwave & Playlist */}
        <div className="hidden md:flex items-center gap-4 w-72 justify-end">
          {/* Desktop Soundwave Visualizer */}
          <SoundwaveVisualizer isPlaying={isPlaying} className="h-6" />

          {/* Playlist Drawer Trigger */}
          <PlaylistDrawer
            playlist={playlist}
            currentTrack={currentTrack}
            onPlayTrack={onPlayFromPlaylist || (() => {})}
            onRemoveTrack={onRemoveFromPlaylist || (() => {})}
            onClearPlaylist={onClearPlaylist || (() => {})}
            isOpen={playlistOpen}
            onOpenChange={setPlaylistOpen}
          />

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setIsMuted(false);
              }}
              className="w-20"
            />
          </div>
        </div>

        {/* Mobile Bottom Row */}
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
          />

          {/* Mobile Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setIsMuted(false);
              }}
              className="w-16"
            />
          </div>
        </div>
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
