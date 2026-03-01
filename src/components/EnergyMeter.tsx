import { cn } from '@/lib/utils';
import type { PowerLevels } from '@/hooks/useSongPowerLevels';

interface EnergyMeterProps {
  levels: PowerLevels;
  isPlaying: boolean;
}

const EnergyMeter = ({ levels, isPlaying }: EnergyMeterProps) => {
  const energy = Math.round((levels.hype * 0.5 + levels.aggression * 0.3 + (100 - levels.chill) * 0.2) * (isPlaying ? 1 : 0.3));

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">⚡ Energy</span>
      <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden relative">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            energy > 80 ? "animate-pulse" : ""
          )}
          style={{
            width: `${energy}%`,
            background: energy > 80
              ? 'linear-gradient(90deg, hsl(var(--primary)), hsl(0 100% 50%))'
              : energy > 50
                ? 'linear-gradient(90deg, hsl(var(--primary)), hsl(50 100% 50%))'
                : 'hsl(var(--primary) / 0.6)',
          }}
        />
      </div>
      <span className="text-xs font-mono text-primary w-8 text-right">{energy}</span>
    </div>
  );
};

export default EnergyMeter;
