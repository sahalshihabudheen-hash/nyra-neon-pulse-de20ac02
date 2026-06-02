import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, ListMusic, Play, X, Music2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface Playlist {
  id: string;
  name: string;
  items: Track[];
}

interface MusicSelectorProps {
  onSelect: (tracks: Track[], source: string, sourceName: string) => void;
  onClose: () => void;
}

const MusicSelector = ({ onSelect, onClose }: MusicSelectorProps) => {
  const { user } = useAuth();
  const { favoriteTracks, loading: favLoading } = useFavorites();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!user) return;

      try {
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select('id, name')
          .eq('user_id', user.id);

        if (playlistError) throw playlistError;

        // Fetch items for each playlist
        const playlistsWithItems: Playlist[] = await Promise.all(
          (playlistData || []).map(async (playlist) => {
            const { data: items } = await supabase
              .from('playlist_items')
              .select('track_id, track_title, track_thumbnail, track_channel')
              .eq('playlist_id', playlist.id)
              .order('position');

            return {
              id: playlist.id,
              name: playlist.name,
              items: (items || []).map(item => ({
                id: item.track_id,
                title: item.track_title,
                thumbnail: item.track_thumbnail,
                channel: item.track_channel,
              })),
            };
          })
        );

        setPlaylists(playlistsWithItems.filter(p => p.items.length > 0));
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [user]);

  const handleSelectFavorites = () => {
    if (favoriteTracks.length > 0) {
      onSelect(favoriteTracks, 'favorites', 'Favorites');
    }
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    if (playlist.items.length > 0) {
      onSelect(playlist.items, 'playlist', playlist.name);
    }
  };

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold theme-gradient-text flex items-center gap-2">
            <Music2 className="w-5 h-5" />
            Select Music
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="w-4 h-4" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="playlists" className="gap-2">
              <ListMusic className="w-4 h-4" />
              Playlists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="mt-0">
            <ScrollArea className="h-[250px] rounded-lg border border-border p-2">
              {favLoading ? (
                <div className="text-center text-muted-foreground py-8">Loading...</div>
              ) : favoriteTracks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No favorites yet. Add some songs to your favorites!
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="secondary"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={handleSelectFavorites}
                  >
                    <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Play All Favorites</p>
                      <p className="text-xs text-muted-foreground">{favoriteTracks.length} tracks</p>
                    </div>
                  </Button>
                  
                  {favoriteTracks.slice(0, 5).map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
                    >
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-8 h-8 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.channel}</p>
                      </div>
                    </div>
                  ))}
                  {favoriteTracks.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{favoriteTracks.length - 5} more tracks
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="playlists" className="mt-0">
            <ScrollArea className="h-[250px] rounded-lg border border-border p-2">
              {loading ? (
                <div className="text-center text-muted-foreground py-8">Loading...</div>
              ) : playlists.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No playlists with tracks. Create one and add some songs!
                </div>
              ) : (
                <div className="space-y-2">
                  {playlists.map((playlist) => (
                    <Button
                      key={playlist.id}
                      variant="secondary"
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => handleSelectPlaylist(playlist)}
                    >
                      <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                        <ListMusic className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{playlist.name}</p>
                        <p className="text-xs text-muted-foreground">{playlist.items.length} tracks</p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Button variant="outline" className="w-full mt-4" onClick={onClose}>
          Play Without Music
        </Button>
      </div>
    </div>
  );
};

export default MusicSelector;
