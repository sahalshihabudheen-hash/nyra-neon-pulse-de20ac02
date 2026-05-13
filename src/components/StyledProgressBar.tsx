import { useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTheme, ProgressBarStyle } from '@/contexts/ThemeContext';

interface StyledProgressBarProps {
  progress: number;
  duration: number;
  onSeek: (value: number) => void;
  onMouseDown?: () => void;
  onMouseUp?: (e: any) => void;
  className?: string;
  showHandle?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const StyledProgressBar = ({
  progress,
  duration,
  onSeek,
  onMouseDown,
  onMouseUp,
  className,
  showHandle = true,
  inputRef,
}: StyledProgressBarProps) => {
  const { settings } = useTheme();
  const style = settings.progressBarStyle || 'classic';
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value));
  };

  // Shared invisible range input
  const rangeInput = (
    <input
      ref={ref}
      type="range"
      min="0"
      max={duration || 100}
      value={progress}
      onChange={handleChange}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onMouseDown}
      onTouchEnd={onMouseUp}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none z-10"
    />
  );

  // Classic style
  if (style === 'classic') {
    return (
      <div className={cn("relative h-2 group rounded-full bg-black/40 border border-white/10 overflow-visible", className)}>
        <div className="absolute inset-0 bg-white/5 rounded-full" />
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ 
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
            boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)'
          }}
        />
        {rangeInput}
        {showHandle && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-xl border-2 border-primary transition-all pointer-events-none z-20"
            style={{ 
              left: `calc(${progressPercent}% - 8px)`,
              boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            }}
          />
        )}
      </div>
    );
  }

  // Wavy style (like the reference image)
  if (style === 'wavy') {
    return (
      <div className={cn("relative h-6 group overflow-visible", className)}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1000 40"
          preserveAspectRatio="none"
        >
          {/* Background wave */}
          <path
            d={generateWavePath(1000)}
            fill="none"
            stroke="hsl(var(--muted-foreground) / 0.3)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Progress wave */}
          <defs>
            <clipPath id="waveProgressClip">
              <rect x="0" y="0" width={progressPercent * 10} height="40" />
            </clipPath>
          </defs>
          <path
            d={generateWavePath(1000)}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="5"
            strokeLinecap="round"
            clipPath="url(#waveProgressClip)"
            style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.6))' }}
          />
        </svg>
        {/* Handle dot */}
        {showHandle && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-primary pointer-events-none z-[20]"
            style={{
              left: `calc(${progressPercent}% - 8px)`,
              boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            }}
          />
        )}
        {rangeInput}
      </div>
    );
  }

  // Dots style
  if (style === 'dots') {
    const dotCount = 40;
    const filledDots = Math.floor((progressPercent / 100) * dotCount);
    return (
      <div className={cn("relative h-4 flex items-center gap-[3px]", className)}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-2 rounded-full transition-all duration-75",
              i < filledDots
                ? "bg-primary shadow-[0_0_4px_hsl(var(--primary))]"
                : "bg-muted-foreground/20"
            )}
          />
        ))}
        {rangeInput}
      </div>
    );
  }

  // Thin style
  if (style === 'thin') {
    return (
      <div className={cn("relative h-1 group rounded-full bg-white/10 overflow-visible", className)}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${progressPercent}%`,
            background: 'var(--theme-gradient, hsl(var(--primary)))',
            boxShadow: '0 0 8px hsl(var(--primary))',
          }}
        />
        {rangeInput}
        {showHandle && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-lg border-2 border-white transition-all pointer-events-none opacity-0 group-hover:opacity-100"
            style={{
              left: `calc(${progressPercent}% - 6px)`,
              background: 'var(--theme-gradient, hsl(var(--primary)))',
            }}
          />
        )}
      </div>
    );
  }

  // Rounded (thick pill) style
  if (style === 'rounded') {
    return (
      <div className={cn("relative h-2.5 group rounded-full bg-white/5 border border-white/10 overflow-visible", className)}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${Math.max(progressPercent, 1)}%`,
            background: `linear-gradient(90deg, #f59e0b, #fbbf24)`,
            boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)',
          }}
        />
        {rangeInput}
        {showHandle && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4.5 h-4.5 rounded-full bg-white shadow-lg border-2 border-primary pointer-events-none transition-all"
            style={{ 
              left: `calc(${progressPercent}% - 9px)`,
              boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            }}
          />
        )}
      </div>
    );
  }

  return null;
};

// Generate a wavy SVG path
function generateWavePath(width: number): string {
  const amplitude = 8;
  const frequency = 14;
  const cy = 20;
  let path = `M 0 ${cy}`;
  for (let x = 0; x <= width; x += 2) {
    const y = cy + Math.sin((x / width) * Math.PI * 2 * frequency) * amplitude;
    path += ` L ${x} ${y}`;
  }
  return path;
}

export default StyledProgressBar;
