import TrackCard from './TrackCard';
import { Loader2, Music } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface TrackGridProps {
  tracks: Track[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onAddToQueue?: (track: Track) => void;
  isLoading: boolean;
  searchPerformed: boolean;
  isFavorite?: (trackId: string) => boolean;
  onToggleFavorite?: (track: Track) => Promise<boolean>;
}

const TrackGrid = ({ 
  tracks, 
  currentTrack, 
  onPlayTrack, 
  onAddToQueue, 
  isLoading, 
  searchPerformed,
  isFavorite,
  onToggleFavorite,
}: TrackGridProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">Searching...</p>
      </div>
    );
  }

  if (searchPerformed && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Music className="w-16 h-16 text-muted-foreground/50" />
        <p className="text-muted-foreground mt-4">No tracks found. Try a different search.</p>
      </div>
    );
  }

  if (!searchPerformed && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
          <Music className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to NYRA</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Search for your favorite songs and artists to start listening
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track}
          isPlaying={currentTrack?.id === track.id}
          onPlay={onPlayTrack}
          onAddToQueue={onAddToQueue}
          isFavorite={isFavorite?.(track.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
};

export default TrackGrid;
