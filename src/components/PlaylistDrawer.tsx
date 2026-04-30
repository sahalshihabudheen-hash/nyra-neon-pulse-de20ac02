import { useState, useCallback } from 'react';
import { Play, Pause, Trash2, ListMusic, X, GripVertical } from 'lucide-react';
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
  isPlaying?: boolean;
  onReorderPlaylist?: (startIndex: number, endIndex: number) => void;
}

const PlaylistDrawer = ({
  playlist,
  currentTrack,
  onPlayTrack,
  onRemoveTrack,
  onClearPlaylist,
  isOpen,
  onOpenChange,
  isPlaying = false,
  onReorderPlaylist,
}: PlaylistDrawerProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);

  // Desktop drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex !== dropIndex && onReorderPlaylist) {
      onReorderPlaylist(dragIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [onReorderPlaylist]);

  // Touch drag handlers for mobile
  const handleTouchStart = useCallback((index: number, e: React.TouchEvent) => {
    e.stopPropagation();
    setTouchStartY(e.touches[0].clientY);
    setTouchDragIndex(index);
    setDraggedIndex(index);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchDragIndex === null || touchStartY === null) return;
    
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const trackItem = elements.find(el => el.getAttribute('data-track-index'));
    
    if (trackItem) {
      const newIndex = parseInt(trackItem.getAttribute('data-track-index') || '0');
      if (newIndex !== dragOverIndex) {
        setDragOverIndex(newIndex);
      }
    }
  }, [touchDragIndex, touchStartY, dragOverIndex]);

  const handleTouchEnd = useCallback(() => {
    if (touchDragIndex !== null && dragOverIndex !== null && touchDragIndex !== dragOverIndex && onReorderPlaylist) {
      onReorderPlaylist(touchDragIndex, dragOverIndex);
    }
    setTouchStartY(null);
    setTouchDragIndex(null);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [touchDragIndex, dragOverIndex, onReorderPlaylist]);

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors relative active:scale-95 touch-manipulation">
          <ListMusic className="w-5 h-5" />
          <span className="text-sm hidden sm:inline">Playlist</span>
          {playlist.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {playlist.length > 99 ? '99+' : playlist.length}
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
                  className="px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors active:scale-95 touch-manipulation"
                >
                  Clear All
                </button>
              )}
              <DrawerClose asChild>
                <button className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary active:scale-95 touch-manipulation">
                  <X className="w-5 h-5" />
                </button>
              </DrawerClose>
            </div>
          </div>
          {onReorderPlaylist && playlist.length > 1 && (
            <p className="text-xs text-muted-foreground mt-2">
              Drag tracks to reorder
            </p>
          )}
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
              {(() => {
                const currentIndex = playlist.findIndex(t => t.id === currentTrack?.id);
                const upNextIndex = currentIndex !== -1 && currentIndex < playlist.length - 1 ? currentIndex + 1 : -1;

                return playlist.map((track, index) => {
                  const isUpNext = index === upNextIndex;
                  const isPlayingCurrent = currentTrack?.id === track.id;

                  return (
                    <div
                      key={track.id}
                      data-track-index={index}
                      draggable={!!onReorderPlaylist}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={cn(
                        'flex items-center gap-2 md:gap-3 p-3 rounded-xl transition-all group select-none',
                        isPlayingCurrent
                          ? 'bg-primary/20 border border-primary/30'
                          : isUpNext
                          ? 'bg-primary/5 border border-primary/10'
                          : 'bg-secondary/30 hover:bg-secondary/50 border border-transparent',
                        draggedIndex === index && 'opacity-50 scale-95 bg-primary/10',
                        dragOverIndex === index && draggedIndex !== index && 'border-primary border-2 border-dashed bg-primary/5'
                      )}
                    >

                  {/* Drag Handle - YouTube style 3-line grip */}
                  {onReorderPlaylist && (
                    <div 
                      className="cursor-grab active:cursor-grabbing touch-manipulation flex-shrink-0 bg-primary/20 hover:bg-primary/40 rounded-lg p-3 shadow-lg border border-primary/50 transition-all duration-200"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onTouchStart={(e) => handleTouchStart(index, e)}
                    >
                      {/* 3 horizontal lines like YouTube */}
                      <div className="flex flex-col gap-1 w-5">
                        <div className="h-0.5 w-full bg-primary rounded-full"></div>
                        <div className="h-0.5 w-full bg-primary rounded-full"></div>
                        <div className="h-0.5 w-full bg-primary rounded-full"></div>
                      </div>
                    </div>
                  )}

                  {/* Index/Playing indicator */}
                  <div className="w-6 text-center flex-shrink-0">
                    {currentTrack?.id === track.id && isPlaying ? (
                      <div className="flex items-center justify-center gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-primary rounded-full equalizer-bar"
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
                    className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                  />

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'font-medium truncate text-sm md:text-base',
                          isPlayingCurrent ? 'text-primary' : 'text-foreground'
                        )}>
                          {track.title}
                        </p>
                        {isUpNext && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-primary text-primary-foreground uppercase tracking-wider shadow-[0_0_10px_rgba(var(--primary),0.5)] shrink-0 animate-pulse">
                            Up Next
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{track.channel}</p>
                    </div>

                  {/* Actions - always visible on mobile */}
                  <div className="flex items-center gap-1.5 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform active:scale-90 touch-manipulation"
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="w-4 h-4" fill="currentColor" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                      )}
                    </button>
                    <button
                      onClick={() => onRemoveTrack(track.id)}
                      className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors active:scale-90 touch-manipulation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                    );
                  });
                })()}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

export default PlaylistDrawer;