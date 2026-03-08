import { useState, useEffect } from 'react';
import { Clock, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface RecentlyPlayedSectionProps {
  onPlayTrack: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
}

const RecentlyPlayedSection = ({ onPlayTrack, currentTrack, isPlaying }: RecentlyPlayedSectionProps) => {
  const { user } = useAuth();
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRecent = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('listening_history')
          .select('track_id, track_title, track_thumbnail, track_channel, played_at')
          .eq('user_id', user.id)
          .order('played_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Deduplicate by track_id, keep most recent
        const seen = new Set<string>();
        const unique: Track[] = [];
        for (const row of data || []) {
          if (!seen.has(row.track_id)) {
            seen.add(row.track_id);
            unique.push({
              id: row.track_id,
              title: row.track_title,
              thumbnail: row.track_thumbnail,
              channel: row.track_channel,
            });
          }
          if (unique.length >= 15) break;
        }
        setRecentTracks(unique);
      } catch (err) {
        console.error('Failed to fetch recently played:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, [user]);

  if (loading || recentTracks.length === 0) return null;

  return (
    <section className="mb-10 animate-in-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-8 rounded-full bg-primary" />
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Recently Played</h2>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {recentTracks.map((track) => {
            const isActive = currentTrack?.id === track.id;
            return (
              <button
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group flex-shrink-0 w-36 md:w-44 text-left focus:outline-none"
              >
                <div className="relative rounded-xl overflow-hidden mb-2 aspect-square">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
                      {isActive && isPlaying ? (
                        <Pause className="w-5 h-5 text-primary-foreground" fill="currentColor" />
                      ) : (
                        <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
                      )}
                    </div>
                  </div>
                  {isActive && isPlaying && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-0.5 bg-primary rounded-full equalizer-bar" style={{ height: '10px' }} />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                <p className="text-xs text-muted-foreground truncate">{track.channel}</p>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
};

export default RecentlyPlayedSection;
