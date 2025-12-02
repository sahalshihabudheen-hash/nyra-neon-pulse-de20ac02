import { useState, useEffect } from 'react';
import { ListPlus, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface Playlist {
  id: string;
  name: string;
}

interface AddToPlaylistDialogProps {
  track: Track;
  trigger?: React.ReactNode;
}

const AddToPlaylistDialog = ({ track, trigger }: AddToPlaylistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlaylists();
    }
  }, [open]);

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('id, name')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error: any) {
      toast.error('Failed to load playlists');
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setLoading(true);
    try {
      // Check if track already exists in playlist
      const { data: existing } = await supabase
        .from('playlist_items')
        .select('id')
        .eq('playlist_id', playlistId)
        .eq('track_id', track.id)
        .single();

      if (existing) {
        toast.info('Track already in this playlist');
        setLoading(false);
        return;
      }

      // Get the highest position
      const { data: items } = await supabase
        .from('playlist_items')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = items && items.length > 0 ? items[0].position + 1 : 0;

      const { error } = await supabase.from('playlist_items').insert({
        playlist_id: playlistId,
        track_id: track.id,
        track_title: track.title,
        track_thumbnail: track.thumbnail,
        track_channel: track.channel,
        position: nextPosition,
      });

      if (error) throw error;

      toast.success('Added to playlist!');
      setOpen(false);
    } catch (error: any) {
      toast.error('Failed to add to playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-secondary text-muted-foreground hover:text-primary hover:bg-secondary/80 flex items-center justify-center transition-all"
            title="Add to playlist"
          >
            <ListPlus className="w-4 h-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold neon-text">Add to Playlist</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {playlists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">No playlists yet</p>
              <p className="text-sm">Create a playlist first</p>
            </div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => handleAddToPlaylist(playlist.id)}
                disabled={loading}
                className={cn(
                  'w-full p-4 rounded-lg text-left transition-all',
                  'bg-secondary hover:bg-secondary/80 text-foreground',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <ListPlus className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{playlist.name}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToPlaylistDialog;
