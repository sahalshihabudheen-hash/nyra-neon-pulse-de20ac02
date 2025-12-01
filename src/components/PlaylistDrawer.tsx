import { Play, Trash2, ListMusic, X } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface PlaylistDrawerProps {
  playlist: Track[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onRemoveTrack: (trackId: string) => void;
  onClearPlaylist: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlaylistDrawer = ({
  playlist,
  currentTrack,
  onPlayTrack,
  onRemoveTrack,
  onClearPlaylist,
  isOpen,
  onOpenChange,
}: PlaylistDrawerProps) => {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors relative">
          <ListMusic className="w-5 h-5" />
          {playlist.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {playlist.length}
            </span>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh] bg-background/95 backdrop-blur-xl border-t border-border">
        <DrawerHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-xl font-bold neon-text flex items-center gap-2">
              <ListMusic className="w-5 h-5" />
              Your Playlist
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({playlist.length} tracks)
              </span>
            </DrawerTitle>
            <div className="flex items-center gap-2">
              {playlist.length > 0 && (
                <button
                  onClick={onClearPlaylist}
                  className="px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
              <DrawerClose asChild>
                <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 h-[60vh] px-4 py-4">
          {playlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <ListMusic className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Your playlist is empty</p>
              <p className="text-sm">Add songs to your playlist to see them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playlist.map((track, index) => (
                <div
                  key={track.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl transition-all group',
                    currentTrack?.id === track.id
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-secondary/30 hover:bg-secondary/50 border border-transparent'
                  )}
                >
                  {/* Index/Playing indicator */}
                  <div className="w-6 text-center">
                    {currentTrack?.id === track.id ? (
                      <div className="flex items-center justify-center gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-primary rounded-full soundwave-bar"
                            style={{ height: '12px' }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium truncate',
                      currentTrack?.id === track.id ? 'text-primary' : 'text-foreground'
                    )}>
                      {track.title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{track.channel}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                    </button>
                    <button
                      onClick={() => onRemoveTrack(track.id)}
                      className="w-9 h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default PlaylistDrawer;
