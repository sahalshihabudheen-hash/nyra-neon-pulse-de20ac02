import { Play, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import AddToPlaylistDialog from './AddToPlaylistDialog';

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
}

const TrackCard = ({ track, isPlaying, onPlay }: TrackCardProps) => {
  return (
    <div
      className={cn(
        'group relative bg-card rounded-2xl overflow-hidden border border-border transition-all duration-300 tilt-card cursor-pointer',
        isPlaying && 'neon-border'
      )}
      onClick={() => onPlay(track)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <button
          className={cn(
            'absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
            isPlaying
              ? 'bg-primary text-primary-foreground neon-glow scale-100'
              : 'bg-primary text-primary-foreground scale-0 group-hover:scale-100 hover:neon-glow'
          )}
        >
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        </button>

        {/* Equalizer Animation (when playing) */}
        {isPlaying && (
          <div className="absolute top-4 left-4 flex items-end gap-0.5 h-4">
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
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {track.title}
        </h3>
        <p className="text-sm text-muted-foreground truncate mt-1">{track.channel}</p>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
        <AddToPlaylistDialog
          track={track}
          trigger={
            <button
              className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <Heart className="w-4 h-4" />
            </button>
          }
        />
        <button
          className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
          onClick={(e) => {
            e.stopPropagation();
            // Handle favorite
          }}
        >
          <Heart className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TrackCard;
