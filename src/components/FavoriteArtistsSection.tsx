import { useState, useEffect } from 'react';
import { User, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ArtistCard from './ArtistCard';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

interface FollowedArtist {
  artist_id: string;
  artist_name: string;
  artist_photo: string;
}

const FavoriteArtistsSection = () => {
  const [artists, setArtists] = useState<FollowedArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowedArtists();

    // Subscribe to changes
    const channel = supabase
      .channel('followed_artists_changes')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'followed_artists' } as any, () => {
        fetchFollowedArtists();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFollowedArtists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('followed_artists' as any)
        .select('artist_id, artist_name, artist_photo')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setArtists(data as unknown as FollowedArtist[]);
    } catch (err) {
      console.error('Error fetching followed artists:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || artists.length === 0) return null;

  return (
    <section className="animate-in-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center gap-3 mb-8 group cursor-default">
        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-lg">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase italic group-hover:neon-text transition-all duration-500">Your Inner Circle</h2>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.3em]">The artists you resonate with most</p>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex gap-8 px-2">
          {artists.map((artist) => (
            <ArtistCard
              key={artist.artist_id}
              id={artist.artist_id}
              artistName={artist.artist_name}
              coverImageUrl={artist.artist_photo}
              className="w-40 shrink-0"
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};

export default FavoriteArtistsSection;
