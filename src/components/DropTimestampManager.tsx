import { useState } from 'react';
import { Plus, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DropTimestampManagerProps {
  trackId: string;
  drops: number[];
  onAddDrop: (trackId: string, timestamp: number) => void;
  onRemoveDrop: (trackId: string, index: number) => void;
}

const formatTimestamp = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const DropTimestampManager = ({ trackId, drops, onAddDrop, onRemoveDrop }: DropTimestampManagerProps) => {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const parts = input.split(':');
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else {
      seconds = parseFloat(input);
    }
    if (!isNaN(seconds) && seconds > 0) {
      onAddDrop(trackId, seconds);
      setInput('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Drop Timestamps</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. 1:32"
          className="flex-1 h-8 px-3 text-xs rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button size="sm" variant="ghost" onClick={handleAdd} className="h-8 w-8 p-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {drops.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {drops.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-xs text-primary">
              ⚡ {formatTimestamp(t)}
              <button onClick={() => onRemoveDrop(trackId, i)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropTimestampManager;
