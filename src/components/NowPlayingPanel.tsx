import { useState, useEffect } from 'react';
import { X, CheckCircle2, User, Share2, MoreHorizontal, Loader2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
}

interface NowPlayingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  nextTrack?: Track | null;
  playlistName?: string;
}

const NowPlayingPanel = ({ isOpen, onClose, currentTrack, nextTrack, playlistName }: NowPlayingPanelProps) => {
  const [artistInfo, setArtistInfo] = useState<{ photo: string; subscribers: string } | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && currentTrack?.channelId) {
      fetchArtistDetails(currentTrack.channelId);
      checkIfFollowed(currentTrack.channelId);
    }
  }, [isOpen, currentTrack?.channelId]);

  const fetchArtistDetails = async (channelId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-youtube-keys?test_channel=${channelId}`,
        { headers: { 'Authorization': `Bearer ${session?.access_token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.channel) {
          setArtistInfo({
            photo: data.channel.photo,
            subscribers: data.channel.subscribers,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching artist details:', err);
    }
  };

  const checkIfFollowed = async (channelId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('followed_artists' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('artist_id', channelId)
        .single();

      setIsFollowed(!!data);
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  };

  const handleFollow = async () => {
    if (!currentTrack?.channelId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to follow artists');
        return;
      }

      if (isFollowed) {
        const { error } = await supabase
          .from('followed_artists' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('artist_id', currentTrack.channelId);

        if (!error) {
          setIsFollowed(false);
          toast.success(`Unfollowed ${currentTrack.channel}`);
        }
      } else {
        const { error } = await supabase
          .from('followed_artists' as any)
          .insert({
            user_id: user.id,
            artist_id: currentTrack.channelId,
            artist_name: currentTrack.channel,
            artist_photo: artistInfo?.photo || '',
          });

        if (!error) {
          setIsFollowed(true);
          toast.success(`Following ${currentTrack.channel}`);
        }
      }
    } catch (err) {
      toast.error('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!currentTrack) return;
    const shareUrl = `${window.location.origin}/api/og?id=${currentTrack.id}&title=${encodeURIComponent(currentTrack.title)}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied!', {
      icon: <Share2 className="w-4 h-4 text-primary" />,
    });
  };

  if (!currentTrack) return null;

  return (
    <aside className={cn(
      "fixed right-0 top-0 h-full w-[350px] bg-sidebar/95 backdrop-blur-xl border-l border-white/10 z-50 transition-transform duration-500 ease-in-out shadow-[-20px_0_50px_rgba(0,0,0,0.5)]",
      isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <h2 className="font-black uppercase tracking-widest text-xs text-primary">{playlistName || "Now Playing"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 pb-24 space-y-8">
            {/* Video Canvas Area */}
            <div className="relative aspect-[4/5] w-full rounded-[2.5rem] overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] group border border-white/5">
               <iframe
                  className="absolute inset-0 w-full h-full object-cover scale-[1.1]"
                  src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${currentTrack.id}&modestbranding=1&rel=0`}
                  title="Now Playing Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Artist Card */}
            <div className="glass-premium border border-white/5 p-6 rounded-[2rem] space-y-4">
               <div className="flex items-center justify-between">
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">About the artist</h4>
                  <div className="flex gap-2">
                    <button onClick={handleShare} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/20 overflow-hidden shrink-0">
                     {artistInfo?.photo ? (
                       <img src={artistInfo.photo} alt={currentTrack.channel} className="w-full h-full object-cover" />
                     ) : (
                       <User className="w-8 h-8 text-primary" />
                     )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                       <p className="font-black uppercase tracking-tight text-lg italic truncate">{currentTrack.channel}</p>
                       <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground">
                      {artistInfo?.subscribers ? `${artistInfo.subscribers} subscribers` : 'Trending Artist'}
                    </p>
                  </div>
               </div>

               <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium line-clamp-4">
                  {currentTrack.channel} is a trending artist known for high-fidelity beats and modern production styles. Discover more of their work in your recommended tracks.
               </p>

               <button 
                onClick={handleFollow}
                disabled={loading}
                className={cn(
                  "w-full py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center justify-center gap-2",
                  isFollowed 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "border-white/10 hover:bg-white/5"
                )}
               >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isFollowed ? (
                    <>
                      <Heart className="w-3 h-3 fill-current" />
                      Following
                    </>
                  ) : (
                    "Follow Artist"
                  )}
               </button>
            </div>

            {/* Next Up Sneak Peek */}
            {nextTrack && (
              <div className="space-y-4">
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-muted-foreground px-2">Next in Queue</h4>
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 group/next cursor-pointer hover:bg-white/10 transition-all">
                    <img src={nextTrack.thumbnail} alt={nextTrack.title} className="w-14 h-14 rounded-xl object-cover shadow-lg group-hover/next:scale-105 transition-transform" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover/next:text-primary transition-colors">{nextTrack.title}</p>
                        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest truncate">{nextTrack.channel}</p>
                    </div>
                  </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
};

export default NowPlayingPanel;

