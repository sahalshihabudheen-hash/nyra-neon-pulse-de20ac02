import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Trash2, Shuffle, Repeat, Repeat1, ArrowLeft, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import MusicPlayer from '@/components/MusicPlayer';
import Sidebar from '@/components/Sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface PlaylistItem {
  id: string;
  track_id: string;
  track_title: string;
  track_thumbnail: string;
  track_channel: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
}

const PlaylistView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const {
    currentTrack, isPlaying,
    handlePlayPause, handlePlayTrack,
    ytPlayerRef, audioRef,
    shuffleMode, toggleShuffle,
    loopMode, cycleLoopMode,
    queue, removeFromQueue,
  } = useMusicPlayer();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('playlists');
  
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user && id) {
      fetchPlaylist();
    }
  }, [user, authLoading, id, navigate]);

  const fetchPlaylist = async () => {
    if (!user) return;
    try {
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (playlistError) throw playlistError;
      setPlaylist(playlistData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select('*')
        .eq('playlist_id', id)
        .order('position', { ascending: true });

      if (itemsError) throw itemsError;

      const tracks = itemsData?.map((item: PlaylistItem) => ({
        id: item.track_id,
        title: item.track_title,
        thumbnail: item.track_thumbnail,
        channel: item.track_channel,
      })) || [];

      setPlaylistTracks(tracks);
    } catch (error: any) {
      toast.error('Failed to load playlist');
      navigate('/playlists');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayFromPlaylistView = useCallback((track: Track) => {
    handlePlayTrack(track, playlistTracks);
  }, [handlePlayTrack, playlistTracks]);

  const handleNextInPlaylist = useCallback(() => {
    if (!currentTrack || playlistTracks.length === 0) return;
    const currentIndex = playlistTracks.findIndex(t => t.id === currentTrack.id);

    if (loopMode === 'one') {
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } else if (ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(0);
        ytPlayerRef.current.playVideo();
      }
      return;
    }

    let nextIndex: number;
    if (loopMode === 'all') {
      nextIndex = (currentIndex + 1) % playlistTracks.length;
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= playlistTracks.length) {
        toast.info('Playlist ended');
        return;
      }
    }
    handlePlayTrack(playlistTracks[nextIndex], playlistTracks);
  }, [currentTrack, playlistTracks, loopMode, handlePlayTrack, audioRef, ytPlayerRef]);

  const handlePreviousInPlaylist = useCallback(() => {
    if (!currentTrack || playlistTracks.length === 0) return;
    const currentIndex = playlistTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex <= 0 ? playlistTracks.length - 1 : currentIndex - 1;
    handlePlayTrack(playlistTracks[prevIndex], playlistTracks);
  }, [currentTrack, playlistTracks, handlePlayTrack]);

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_items')
        .delete()
        .eq('playlist_id', id)
        .eq('track_id', trackId);
      if (error) throw error;
      toast.success('Track removed');
      fetchPlaylist();
    } catch {
      toast.error('Failed to remove track');
    }
  };

  const handlePlaylistSearch = async () => {
    if (!playlistSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search?q=${encodeURIComponent(playlistSearchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (!response.ok) throw new Error('Search failed');
      const results = await response.json();
      if (results.error) throw new Error(results.error);
      setSearchResults(results);
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToPlaylistDB = async (track: Track) => {
    try {
      const exists = playlistTracks.some(t => t.id === track.id);
      if (exists) { toast.info('Track already in playlist'); return; }
      const nextPosition = playlistTracks.length;
      const { error } = await supabase.from('playlist_items').insert({
        playlist_id: id,
        track_id: track.id,
        track_title: track.title,
        track_thumbnail: track.thumbnail,
        track_channel: track.channel,
        position: nextPosition,
      });
      if (error) throw error;
      toast.success('Added to playlist!');
      fetchPlaylist();
      setSearchResults([]);
      setPlaylistSearchQuery('');
    } catch {
      toast.error('Failed to add track');
    }
  };

  const getLoopIcon = () => {
    switch (loopMode) {
      case 'one': return <Repeat1 className="w-5 h-5" />;
      default: return <Repeat className="w-5 h-5" />;
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    const reordered = [...playlistTracks];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    setPlaylistTracks(reordered);
    setDraggedIndex(null);
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase.from('playlist_items').update({ position: i }).eq('playlist_id', id).eq('track_id', reordered[i].id);
      }
    } catch {}
  };

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    e.stopPropagation();
    setTouchStartY(e.touches[0].clientY);
    setTouchDragIndex(index);
    setDraggedIndex(index);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchDragIndex === null || touchStartY === null) return;
    const diff = e.touches[0].clientY - touchStartY;
    const moveCount = Math.round(diff / 80);
    if (moveCount !== 0) {
      const newIndex = Math.max(0, Math.min(playlistTracks.length - 1, touchDragIndex + moveCount));
      if (newIndex !== touchDragIndex) {
        const reordered = [...playlistTracks];
        const [removed] = reordered.splice(touchDragIndex, 1);
        reordered.splice(newIndex, 0, removed);
        setPlaylistTracks(reordered);
        setTouchDragIndex(newIndex);
        setTouchStartY(e.touches[0].clientY);
      }
    }
  }, [touchDragIndex, touchStartY, playlistTracks]);

  const handleTouchEnd = async () => {
    if (touchDragIndex !== null) {
      try {
        for (let i = 0; i < playlistTracks.length; i++) {
          await supabase.from('playlist_items').update({ position: i }).eq('playlist_id', id).eq('track_id', playlistTracks[i].id);
        }
      } catch {}
    }
    setTouchStartY(null);
    setTouchDragIndex(null);
    setDraggedIndex(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/80 flex flex-col">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <Navbar
        searchQuery={navSearchQuery}
        onSearchChange={setNavSearchQuery}
        onSearch={() => navigate('/')}
      />
      
      <main className="flex-1 md:ml-64 pt-20 pb-36 px-4 md:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/playlists')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Playlists
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold neon-text mb-2">{playlist?.name}</h1>
              {playlist?.description && (
                <p className="text-muted-foreground mb-2">{playlist.description}</p>
              )}
              <p className="text-muted-foreground">{playlistTracks.length} tracks</p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={toggleShuffle}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  shuffleMode
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              
              <button
                onClick={cycleLoopMode}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  loopMode !== 'off'
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title={`Loop: ${loopMode}`}
              >
                {getLoopIcon()}
              </button>
            </div>
          </div>
        </div>

        {/* Search within playlist page */}
        <div className="mb-8 glass-premium border border-white/5 p-6 rounded-[2rem] shadow-xl animate-in-up">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
             </div>
             <div>
                <h3 className="text-xl font-black text-foreground uppercase italic tracking-tighter">Add Songs</h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Find your next favorite</p>
             </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Search YouTube for songs..."
                value={playlistSearchQuery}
                onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePlaylistSearch()}
                className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all font-medium placeholder:text-muted-foreground/40"
              />
            </div>
            <button 
              onClick={handlePlaylistSearch} 
              disabled={isSearching}
              className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-8 border-t border-white/5 pt-6">
              <ScrollArea className="h-[400px] pr-4 -mr-4">
                <div className="grid grid-cols-1 gap-3">
                  {searchResults.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5 transition-all group"
                    >
                      <div className="relative w-14 h-14 flex-shrink-0">
                         <img src={track.thumbnail} alt={track.title} className="w-full h-full rounded-xl object-cover" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity">
                            <Play className="w-5 h-5 text-white" fill="currentColor" />
                         </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{track.title}</p>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{track.channel}</p>
                      </div>
                      <button 
                        onClick={() => handleAddToPlaylistDB(track)}
                        className="px-5 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-widest transition-all active:scale-90"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Playlist Tracks */}
        {playlistTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Play className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-medium">This playlist is empty</p>
            <p className="text-sm">Use the search above to add songs</p>
          </div>
        ) : (
          <div className="h-[calc(100vh-500px)] min-h-64 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-3">
              {playlistTracks.map((track, index) => (
                <div
                  key={track.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => setDraggedIndex(null)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={cn(
                    'w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-500 group relative overflow-hidden',
                    currentTrack?.id === track.id
                      ? 'bg-primary/10 border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.1)]'
                      : 'glass-premium border border-white/5 hover:bg-white/10 hover:border-white/10',
                    draggedIndex === index && 'opacity-50 scale-[0.98]'
                  )}
                >
                  {/* Playing Indicator Line */}
                  {currentTrack?.id === track.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary animate-pulse" />
                  )}

                  {/* Drag Handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing touch-manipulation flex-shrink-0 opacity-20 group-hover:opacity-100 transition-all p-2 hover:bg-white/5 rounded-xl"
                    onTouchStart={(e) => handleTouchStart(index, e)}
                  >
                    <div className="flex flex-col gap-1 w-4">
                      <div className="h-0.5 w-full bg-foreground rounded-full"></div>
                      <div className="h-0.5 w-full bg-foreground rounded-full"></div>
                    </div>
                  </div>

                  <div className="relative shrink-0 group/art">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover shadow-lg transition-transform duration-500 group-hover/art:scale-110"
                      loading="lazy"
                    />
                    <button
                      onClick={() => {
                        if (currentTrack?.id === track.id) {
                          handlePlayPause();
                        } else {
                          handlePlayFromPlaylistView(track);
                        }
                      }}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-[2px] transition-all",
                        currentTrack?.id === track.id ? "opacity-100" : "opacity-0 group-hover/art:opacity-100"
                      )}
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="w-5 h-5 text-primary fill-current" />
                      ) : (
                        <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-bold truncate text-sm md:text-base tracking-tight transition-colors',
                      currentTrack?.id === track.id ? 'text-primary italic' : 'text-foreground'
                    )}>
                      {track.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] truncate">{track.channel}</p>
                       <div className="w-1 h-1 rounded-full bg-white/10" />
                       <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Premium Audio</span>
                    </div>
                  </div>

                  {/* Time Indicator */}
                  <div className="hidden sm:flex items-center gap-6 mr-4">
                     <span className="text-[11px] font-black text-muted-foreground/40 tabular-nums tracking-[0.2em]">
                        {/* Mock time for now, can be replaced with real duration if available */}
                        0{Math.floor(Math.random() * 3) + 2}:{Math.floor(Math.random() * 50) + 10}
                     </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRemoveTrack(track.id)}
                      className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all active:scale-90"
                      title="Remove from playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {currentTrack && (
        <MusicPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNextInPlaylist}
          onPrevious={handlePreviousInPlaylist}
          playlist={playlistTracks}
          onPlayFromPlaylist={handlePlayFromPlaylistView}
          onRemoveFromPlaylist={handleRemoveTrack}
          onClearPlaylist={() => {}}
          ytPlayerRef={ytPlayerRef}
          audioRef={audioRef}
          shuffleMode={shuffleMode}
          onToggleShuffle={toggleShuffle}
          loopMode={loopMode}
          onCycleLoopMode={cycleLoopMode}
          queue={queue}
          onRemoveFromQueue={removeFromQueue}
        />
      )}
    </div>
  );
};

export default PlaylistView;
