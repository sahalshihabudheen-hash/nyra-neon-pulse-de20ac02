import { Play, Pause, ListPlus, Heart, Download, Loader2, Share2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import AddToPlaylistDialog from './AddToPlaylistDialog';
import { toast } from 'sonner';
import { useDownloadManager } from '@/contexts/DownloadManagerContext';

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
  const { startDownload, isDownloading } = useDownloadManager();
  const downloading = isDownloading(track.id);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    startDownload(track);
  };
  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToQueue) {
      onAddToQueue(track);
      toast.success('⌛ Added to queue!');
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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/api/og?id=${track.id}&title=${encodeURIComponent(track.title)}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  return (
    <div
      className={cn(
        'group relative glass-premium rounded-[2rem] overflow-hidden border border-white/5 transition-all duration-500 cursor-pointer shadow-xl hover:shadow-primary/10 hover:-translate-y-1',
        isPlaying && 'ring-2 ring-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.2)]'
      )}
      onClick={handleCardClick}
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-square overflow-hidden m-2 rounded-[1.5rem]">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[2px]">
          <button
            onClick={handlePlayNow}
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 transform scale-75 group-hover:scale-100 shadow-2xl',
              isPlaying ? 'bg-primary text-primary-foreground' : 'bg-white text-black hover:bg-primary hover:text-primary-foreground'
            )}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>
        </div>

        {/* Favorite Button (Top Left) */}
        <button
          className={cn(
            'absolute top-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 backdrop-blur-md border border-white/10 z-10',
            isFavorite ? 'bg-primary text-primary-foreground' : 'bg-black/40 text-white hover:bg-white/10'
          )}
          onClick={handleToggleFavorite}
        >
          <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Action Group (Top Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 transform translate-x-12 group-hover:translate-x-0 transition-transform duration-500 z-10">
          <button onClick={handleDownload} className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-primary transition-all">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
          <button onClick={handleShare} className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-primary transition-all">
            <Share2 className="w-4 h-4" />
          </button>
          <AddToPlaylistDialog
            track={track}
            trigger={
              <button className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-primary transition-all">
                <ListPlus className="w-4 h-4" />
              </button>
            }
          />
        </div>

        {/* Equalizer (playing state) */}
        {isPlaying && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-1 h-6 px-3 py-1.5 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-1 bg-primary rounded-full animate-bounce" style={{ animationDuration: `${0.5 + i * 0.1}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 pt-1">
        <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors text-base tracking-tight">
          {track.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[11px] font-bold text-muted-foreground/60 truncate uppercase tracking-widest flex-1">{track.channel}</p>
          {isPlaying && <Zap className="w-3 h-3 text-primary animate-pulse" />}
        </div>
      </div>
    </div>
  );
};

export default TrackCard;

