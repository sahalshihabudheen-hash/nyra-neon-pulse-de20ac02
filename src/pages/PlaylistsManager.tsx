import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListMusic, Trash2, Music2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import CreatePlaylistDialog from '@/components/CreatePlaylistDialog';
import { cn } from '@/lib/utils';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  track_count?: number;
}

const PlaylistsManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('playlists');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchPlaylists();
    }
  }, [user, authLoading, navigate]);

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_items(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });


      if (error) throw error;

      const playlistsWithCount = data?.map(p => ({
        ...p,
        track_count: p.playlist_items?.[0]?.count || 0,
      })) || [];

      setPlaylists(playlistsWithCount);
    } catch (error: any) {
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      // First delete all items in the playlist
      const { error: itemsError } = await supabase.from('playlist_items').delete().eq('playlist_id', id);
      if (itemsError) throw itemsError;

      const { error } = await supabase.from('playlists').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Playlist deleted');
      fetchPlaylists();
    } catch (error: any) {
      console.error('Delete playlist error:', error);
      toast.error(error.message || 'Failed to delete playlist');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={() => navigate('/')}
      />
      
      <main className="flex-1 md:ml-64 pt-20 pb-32 px-4 md:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold neon-text mb-2">Your Playlists</h1>
              <p className="text-muted-foreground">{playlists.length} playlists</p>
            </div>
            <CreatePlaylistDialog onPlaylistCreated={fetchPlaylists} />
          </div>
        </div>

        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ListMusic className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-medium">No playlists yet</p>
            <p className="text-sm">Create your first playlist to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className={cn(
                  'group relative p-6 rounded-xl transition-all cursor-pointer',
                  'bg-card hover:bg-card/80 border border-border hover:border-primary/50'
                )}
                onClick={() => navigate(`/playlist/${playlist.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Music2 className="w-8 h-8 text-primary" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="font-bold text-lg mb-2 truncate text-foreground">
                  {playlist.name}
                </h3>
                {playlist.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {playlist.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {playlist.track_count} {playlist.track_count === 1 ? 'track' : 'tracks'}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlaylistsManager;
