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
        'group relative bg-card rounded-2xl overflow-hidden border border-border transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] touch-manipulation',
        isPlaying && 'ring-2 ring-primary/50'
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
        
        {/* Gradient Overlay - always visible on mobile */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/60 md:from-background/95 md:via-background/30 md:to-transparent md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button - Bottom right */}
        <button
          onClick={handlePlayNow}
          className={cn(
            'absolute bottom-2 right-2 md:bottom-3 md:right-3 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 touch-manipulation shadow-lg',
            isPlaying
              ? 'bg-primary text-primary-foreground scale-100'
              : 'bg-primary text-primary-foreground md:scale-0 md:group-hover:scale-100 active:scale-95'
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
          ) : (
            <Play className="w-4 h-4 md:w-5 md:h-5 ml-0.5" fill="currentColor" />
          )}
        </button>

        {/* Equalizer Animation (when playing) */}
        {isPlaying && (
          <div className="absolute top-2 left-2 flex items-end gap-0.5 h-4 bg-background/60 rounded px-1 py-0.5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full equalizer-bar"
                style={{ height: '100%' }}
              />
            ))}
          </div>
        )}

        {/* Action Buttons - Top area, always visible */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 md:flex-row md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all z-10">
          {/* Favorite Heart */}
          {onToggleFavorite && (
            <button
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation shadow-md backdrop-blur-sm',
                isFavorite
                  ? 'bg-primary text-primary-foreground'
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
            className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all active:scale-90 touch-manipulation shadow-md"
            onClick={handleAddToQueue}
            title="Add to Queue"
          >
            <span className="text-sm">⌛</span>
          </button>
          {/* Add to Playlist */}
          <AddToPlaylistDialog
            track={track}
            trigger={
              <button
                className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:text-primary hover:bg-background transition-all active:scale-90 touch-manipulation shadow-md"
                onClick={(e) => e.stopPropagation()}
                title="Add to Playlist"
              >
                <ListPlus className="w-4 h-4" />
              </button>
            }
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 md:p-4">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-xs md:text-base">
          {track.title}
        </h3>
        <p className="text-[10px] md:text-sm text-muted-foreground truncate mt-0.5 md:mt-1">{track.channel}</p>
      </div>
    </div>
  );
};

export default TrackCard;
