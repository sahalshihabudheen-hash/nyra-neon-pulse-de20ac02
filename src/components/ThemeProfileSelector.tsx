import { cn } from '@/lib/utils';
import { type ThemeProfile, themeProfiles } from '@/hooks/useThemeProfile';

interface ThemeProfileSelectorProps {
  current: ThemeProfile;
  onChange: (p: ThemeProfile) => void;
}

const ThemeProfileSelector = ({ current, onChange }: ThemeProfileSelectorProps) => {
  const profiles = Object.entries(themeProfiles).filter(([k]) => k !== 'default') as [ThemeProfile, typeof themeProfiles[ThemeProfile]][];

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-foreground">Theme Profile</span>
      <div className="flex gap-2 flex-wrap">
        {profiles.map(([key, config]) => (
          <button
            key={key}
            onClick={() => onChange(current === key ? 'default' : key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              current === key
                ? 'bg-primary/20 border-primary text-primary neon-glow'
                : 'bg-secondary/30 border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            )}
          >
            {config.emoji} {config.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeProfileSelector;
