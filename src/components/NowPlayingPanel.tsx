import { X, CheckCircle2, User, Share2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

interface NowPlayingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  playlistName?: string;
}

const NowPlayingPanel = ({ isOpen, onClose, currentTrack, playlistName }: NowPlayingPanelProps) => {
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
            <div className="relative aspect-[9/16] w-full rounded-[2rem] overflow-hidden bg-black shadow-2xl group">
               <iframe
                  className="absolute inset-0 w-full h-full object-cover scale-[1.3]"
                  src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${currentTrack.id}&modestbranding=1&rel=0`}
                  title="Now Playing Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                
                {/* Overlay Text */}
                <div className="absolute bottom-8 left-6 right-6">
                   <h3 className="text-2xl font-black text-white leading-tight mb-2 italic tracking-tighter uppercase">{currentTrack.title}</h3>
                   <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white/80">{currentTrack.channel}</p>
                      <CheckCircle2 className="w-4 h-4 text-primary fill-primary/20" />
                   </div>
                </div>
            </div>

            {/* Artist Card */}
            <div className="glass-premium border border-white/5 p-6 rounded-[2rem] space-y-4">
               <div className="flex items-center justify-between">
                  <h4 className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">About the artist</h4>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                     <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-black uppercase tracking-tight text-lg italic">{currentTrack.channel}</p>
                       <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground">10,928,952 monthly listeners</p>
                  </div>
               </div>

               <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium line-clamp-4">
                  {currentTrack.channel} is a trending artist known for high-fidelity beats and modern production styles. Discover more of their work in your recommended tracks.
               </p>

               <button className="w-full py-3 rounded-xl border border-white/10 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all active:scale-95">
                  Follow Artist
               </button>
            </div>

            {/* Next Up Sneak Peek */}
            <div className="space-y-4">
                <h4 className="font-black uppercase tracking-widest text-[10px] text-muted-foreground px-2">Next in Queue</h4>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 animate-pulse" />
                   <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 bg-white/10 rounded-full" />
                      <div className="h-2 w-1/2 bg-white/5 rounded-full" />
                   </div>
                </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
};

export default NowPlayingPanel;
