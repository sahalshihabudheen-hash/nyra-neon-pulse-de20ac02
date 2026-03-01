import { Slider } from '@/components/ui/slider';
import { Flame, Wind, Sword } from 'lucide-react';
import type { PowerLevels } from '@/hooks/useSongPowerLevels';

interface SongPowerSlidersProps {
  levels: PowerLevels;
  onChange: (levels: Partial<PowerLevels>) => void;
}

const SongPowerSliders = ({ levels, onChange }: SongPowerSlidersProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-xs text-foreground w-16">Hype</span>
        <Slider value={[levels.hype]} max={100} step={1} onValueChange={v => onChange({ hype: v[0] })} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8 text-right">{levels.hype}</span>
      </div>
      <div className="flex items-center gap-2">
        <Wind className="w-4 h-4 text-blue-400" />
        <span className="text-xs text-foreground w-16">Chill</span>
        <Slider value={[levels.chill]} max={100} step={1} onValueChange={v => onChange({ chill: v[0] })} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8 text-right">{levels.chill}</span>
      </div>
      <div className="flex items-center gap-2">
        <Sword className="w-4 h-4 text-red-400" />
        <span className="text-xs text-foreground w-16">Aggro</span>
        <Slider value={[levels.aggression]} max={100} step={1} onValueChange={v => onChange({ aggression: v[0] })} className="flex-1" />
        <span className="text-xs text-muted-foreground w-8 text-right">{levels.aggression}</span>
      </div>
    </div>
  );
};

export default SongPowerSliders;
