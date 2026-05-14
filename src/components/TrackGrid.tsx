import TrackCard from './TrackCard';
import { Loader2, Music, Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  isPlaying: boolean;
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
  isPlaying,
  searchPerformed,
  isFavorite,
  onToggleFavorite,
}: TrackGridProps) => {


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Disc3 className="w-16 h-16 text-primary rotate-glow" />
        </div>
        <p className="text-muted-foreground mt-6 animate-pulse">Searching for tracks...</p>
      </div>
    );
  }

  if (searchPerformed && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-muted/20 blur-xl" />
          <Music className="w-16 h-16 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground">No tracks found. Try a different search.</p>
      </div>
    );
  }

  if (!searchPerformed && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl glow-pulse" />
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
            <Music className="w-12 h-12 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Welcome to NYRA</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Search for your favorite songs and artists to start listening
        </p>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-8 rounded-full bg-primary/40 soundwave-bar"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 stagger-children">
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track}
          isCurrent={currentTrack?.id === track.id}
          isPlaying={isPlaying}
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
