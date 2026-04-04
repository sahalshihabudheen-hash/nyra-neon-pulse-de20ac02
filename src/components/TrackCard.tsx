import { Play, Pause, ListPlus, Heart, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import AddToPlaylistDialog from './AddToPlaylistDialog';
import { toast } from 'sonner';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (track: Track) => Promise<boolean>;
}

const TrackCard = ({ track, isPlaying, onPlay, onAddToQueue, isFavorite = false, onToggleFavorite }: TrackCardProps) => {
  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToQueue) {
      onAddToQueue(track);
      toast.success('⌛ Added to queue - plays next!');
    }
  };

  const handlePlayNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(track);
  };

  const handleCardClick = () => {
    onPlay(track);
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      await onToggleFavorite(track);
    }
  };

  return (
    <div
      className={cn(
        'group relative bg-card rounded-2xl overflow-hidden border border-border transition-all duration-300 cursor-pointer card-glow touch-manipulation',
        isPlaying && 'ring-2 ring-primary/60 neon-glow'
      )}
      onClick={handleCardClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Gradient Overlay - enhanced */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Play Button - Bottom left on mobile to avoid overlap with action buttons */}
        <button
          onClick={handlePlayNow}
          className={cn(
            'absolute bottom-3 left-3 md:left-auto md:right-3 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 touch-manipulation shadow-xl z-20',
            isPlaying
              ? 'bg-primary text-primary-foreground scale-100 neon-glow'
              : 'bg-primary text-primary-foreground md:scale-0 md:group-hover:scale-100 active:scale-95 hover:neon-glow'
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
          ) : (
            <Play className="w-5 h-5 md:w-6 md:h-6 ml-0.5" fill="currentColor" />
          )}
        </button>

        {/* Equalizer Animation (when playing) */}
        {isPlaying && (
          <div className="absolute top-3 left-3 flex items-end gap-0.5 h-5 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full equalizer-bar"
                style={{ height: '100%' }}
              />
            ))}
          </div>
        )}

        {/* Action Buttons - Top area */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 md:flex-row md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
          {/* Favorite Heart */}
          {onToggleFavorite && (
            <button
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation shadow-lg backdrop-blur-sm',
                isFavorite
                  ? 'bg-primary text-primary-foreground glow-pulse'
                  : 'bg-background/80 text-foreground hover:text-primary hover:bg-background'
              )}
              onClick={handleToggleFavorite}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          {/* Add to Queue */}
          <button
            className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all active:scale-90 touch-manipulation shadow-lg"
            onClick={handleAddToQueue}
            title="Add to Queue"
          >
            <span className="text-base">⌛</span>
          </button>
          {/* Add to Playlist */}
          <AddToPlaylistDialog
            track={track}
            trigger={
              <button
                className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:text-primary hover:bg-background transition-all active:scale-90 touch-manipulation shadow-lg"
                onClick={(e) => e.stopPropagation()}
                title="Add to Playlist"
              >
                <ListPlus className="w-4 h-4" />
              </button>
            }
          />
        </div>
      </div>

      {/* Info - Enhanced */}
      <div className="p-3 md:p-4 relative">
        {/* Subtle glow line */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm md:text-base">
          {track.title}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground truncate mt-1">{track.channel}</p>
      </div>
    </div>
  );
};

export default TrackCard;
