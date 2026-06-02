import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreatePlaylistDialogProps {
  onPlaylistCreated: () => void;
}

const CreatePlaylistDialog = ({ onPlaylistCreated }: CreatePlaylistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('playlists').insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
      });

      if (error) throw error;

      toast.success('Playlist created!');
      setName('');
      setDescription('');
      setOpen(false);
      onPlaylistCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow">
          <Plus className="w-4 h-4 mr-2" />
          Create Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold neon-text">Create New Playlist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Input
              placeholder="Playlist name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary border-border"
              required
            />
          </div>
          <div>
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary border-border resize-none"
              rows={3}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Playlist'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlaylistDialog;
