import { useState } from 'react';
import { Music, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AVAILABLE_GENRES } from '@/hooks/useUserPreferences';

const genreIcons: Record<string, string> = {
  "Pop": "🎵",
  "Hip-Hop": "🎤",
  "Rock": "🎸",
  "R&B": "🎶",
  "Electronic": "🎧",
  "Bollywood": "🎬",
  "K-Pop": "💜",
  "Latin": "💃",
};

interface GenreOnboardingProps {
  open: boolean;
  onComplete: (genres: string[]) => void;
}

const GenreOnboarding = ({ open, onComplete }: GenreOnboardingProps) => {
  const { gradient } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (genre: string) => {
    setSelected(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    onComplete(selected);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-background/95 backdrop-blur-xl" onInteractOutside={(e) => e.preventDefault()}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">What music do you love?</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick your favorite genres to personalize your feed</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {AVAILABLE_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => toggle(genre)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-95 touch-manipulation",
                selected.includes(genre)
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
              )}
            >
              <span className="text-xl">{genreIcons[genre] || "🎵"}</span>
              <span className="font-medium text-sm">{genre}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          className={cn(
            "w-full py-3 rounded-xl font-semibold transition-all active:scale-95 touch-manipulation",
            selected.length > 0
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
          style={selected.length > 0 && gradient.enabled ? { background: 'var(--theme-gradient)' } : undefined}
        >
          <span className="flex items-center justify-center gap-2">
            <Music className="w-5 h-5" />
            {selected.length > 0 ? `Continue with ${selected.length} genre${selected.length > 1 ? 's' : ''}` : 'Select at least one'}
          </span>
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default GenreOnboarding;
