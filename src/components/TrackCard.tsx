import { Play, Pause, ListPlus, PlayCircle, Heart } from 'lucide-react';
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
        'group relative bg-card rounded-2xl overflow-hidden border border-border transition-all duration-300 tilt-card cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] touch-manipulation',
        isPlaying && 'neon-border ring-2 ring-primary/50'
      )}
      onClick={handleCardClick}
      onTouchEnd={(e) => {
        // Prevent double-firing on touch devices
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.track-card-main')) {
          e.preventDefault();
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <button
          className={cn(
            'absolute bottom-3 right-3 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 touch-manipulation',
            isPlaying
              ? 'bg-primary text-primary-foreground neon-glow scale-100'
              : 'bg-primary text-primary-foreground scale-0 group-hover:scale-100 hover:neon-glow active:scale-95'
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" fill="currentColor" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
          )}
        </button>

        {/* Equalizer Animation (when playing) */}
        {isPlaying && (
          <div className="absolute top-3 left-3 flex items-end gap-0.5 h-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full equalizer-bar"
                style={{ height: '100%' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 md:p-4">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm md:text-base">
          {track.title}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground truncate mt-1">{track.channel}</p>
      </div>

      {/* Action Buttons - Always visible on mobile */}
      <div className="absolute top-3 right-3 flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
        {/* Favorite Heart */}
        {onToggleFavorite && (
          <button
            className={cn(
              'w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation shadow-lg',
              isFavorite
                ? 'bg-primary text-primary-foreground'
                : 'bg-background/90 text-muted-foreground hover:text-primary hover:bg-primary/20'
            )}
            onClick={handleToggleFavorite}
            title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
        {/* Play Now */}
        <button
          className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-primary/90 flex items-center justify-center text-primary-foreground hover:bg-primary transition-all active:scale-90 touch-manipulation shadow-lg"
          onClick={handlePlayNow}
          title="Play Now"
        >
          <PlayCircle className="w-4 h-4" />
        </button>
        {/* Add to Queue with emoji */}
        <button
          className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-background/90 flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all active:scale-90 touch-manipulation shadow-lg border border-primary/30"
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
              className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-background/90 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/20 transition-all active:scale-90 touch-manipulation shadow-lg"
              onClick={(e) => e.stopPropagation()}
              title="Add to Playlist"
            >
              <ListPlus className="w-4 h-4" />
            </button>
          }
        />
      </div>
    </div>
  );
};

export default TrackCard;