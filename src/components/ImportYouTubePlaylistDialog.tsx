import { useState } from 'react';
import { Youtube, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getFunctionAuthHeaders } from '@/lib/functionAuth';
import { toast } from 'sonner';

interface ImportYouTubePlaylistDialogProps {
  onPlaylistImported: () => void;
}

interface ImportedTrack {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

const ImportYouTubePlaylistDialog = ({ onPlaylistImported }: ImportYouTubePlaylistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please paste a YouTube playlist link');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-playlist?url=${encodeURIComponent(url.trim())}`,
        { headers: await getFunctionAuthHeaders() }
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || 'Failed to import playlist');

      const tracks: ImportedTrack[] = data.tracks || [];
      if (tracks.length === 0) throw new Error('No tracks found in that playlist');

      const playlistName = name.trim() || data.name || 'Imported Playlist';

      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name: playlistName,
          description: 'Imported from YouTube',
        })
        .select('id')
        .single();

      if (playlistError) throw playlistError;

      const itemsToInsert = tracks.map((track, index) => ({
        playlist_id: playlist.id,
        track_id: track.id,
        track_title: track.title,
        track_thumbnail: track.thumbnail,
        track_channel: track.channel,
        position: index,
      }));

      const { error: itemsError } = await supabase.from('playlist_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      toast.success(`Imported ${tracks.length} tracks into "${playlistName}"`);
      setUrl('');
      setName('');
      setOpen(false);
      onPlaylistImported();
    } catch (error: any) {
      toast.error(error.message || 'Failed to import playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-border hover:border-primary/50">
          <Youtube className="w-4 h-4 mr-2" />
          Import from YouTube
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold neon-text">Import YouTube Playlist</DialogTitle>
          <DialogDescription>
            Paste a public YouTube playlist link and we'll add its tracks to a new playlist.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <Input
              placeholder="https://www.youtube.com/playlist?list=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-secondary border-border"
              required
            />
          </div>
          <div>
            <Input
              placeholder="Playlist name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Playlist'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImportYouTubePlaylistDialog;
