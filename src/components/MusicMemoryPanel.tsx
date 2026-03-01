import { useState } from 'react';
import { Clock, TrendingUp, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MemoryEntry {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  playCount: number;
  lastPlayed: number;
}

interface MusicMemoryPanelProps {
  mostPlayed: MemoryEntry[];
  recentlyPlayed: MemoryEntry[];
  onPlayTrack?: (track: { id: string; title: string; thumbnail: string; channel: string }) => void;
}

const MusicMemoryPanel = ({ mostPlayed, recentlyPlayed, onPlayTrack }: MusicMemoryPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'most' | 'recent'>('most');

  const items = tab === 'most' ? mostPlayed : recentlyPlayed;

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Music Memory</span>
          <span className="text-xs text-muted-foreground">({Object.keys(mostPlayed).length} tracks)</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="border-t border-border/20">
          <div className="flex border-b border-border/20">
            <button
              onClick={() => setTab('most')}
              className={cn(
                'flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
                tab === 'most' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              )}
            >
              <TrendingUp className="w-3 h-3" /> Most Played
            </button>
            <button
              onClick={() => setTab('recent')}
              className={cn(
                'flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
                tab === 'recent' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              )}
            >
              <Clock className="w-3 h-3" /> Recent
            </button>
          </div>
          <ScrollArea className="h-48">
            <div className="p-2 space-y-1">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No history yet</p>
              )}
              {items.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/20 transition-colors cursor-pointer group"
                  onClick={() => onPlayTrack?.(entry)}
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <img src={entry.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground group-hover:text-primary transition-colors">{entry.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {tab === 'most' ? `${entry.playCount} plays` : timeAgo(entry.lastPlayed)}
                    </p>
                  </div>
                  <Play className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default MusicMemoryPanel;
