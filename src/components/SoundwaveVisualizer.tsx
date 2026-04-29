import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme, type SoundwaveShape } from '@/contexts/ThemeContext';


interface SoundwaveVisualizerProps {
  isPlaying: boolean;
  className?: string;
  shape?: SoundwaveShape;
}

const SoundwaveVisualizer = ({ isPlaying, className, shape: propShape }: SoundwaveVisualizerProps) => {
  const { settings } = useTheme();
  const shape = propShape || settings.soundwaveShape || 'bars';
  const [barHeights, setBarHeights] = useState<number[]>(Array(16).fill(20));
  const [dotSizes, setDotSizes] = useState<number[]>(Array(8).fill(4));
  const [pulseScale, setPulseScale] = useState(1);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isPlaying) {
      setBarHeights(Array(16).fill(20));
      setDotSizes(Array(8).fill(4));
      setPulseScale(1);
      return;
    }

    const animate = () => {
      // Bars animation - faster updates for smoother equalizer effect
      const newHeights = Array(16).fill(0).map(() => Math.random() * 100);
      setBarHeights(newHeights);
      
      // Dots animation
      const newDots = Array(8).fill(0).map(() => Math.random() * 8 + 2);
      setDotSizes(newDots);
      
      // Pulse animation
      setPulseScale(0.8 + Math.random() * 0.4);
      
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(animate, 50); // Faster animation (was 80ms)
      });
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  // Bars Shape (Classic) - PROPER EQUALIZER
  if (shape === 'bars') {
    return (
      <div className={cn('flex items-end justify-center gap-1 h-8', className)}>
        {barHeights.slice(0, 12).map((height, index) => (
          <div
            key={index}
            className="w-1 rounded-full bg-primary"
            style={{
              height: isPlaying ? `${Math.max(15, height)}%` : '20%',
              boxShadow: isPlaying 
                ? '0 0 6px hsl(var(--primary)), 0 0 12px hsl(var(--primary) / 0.6)' 
                : '0 0 3px hsl(var(--primary) / 0.4)',
              transition: 'height 0.08s ease-out',
              opacity: isPlaying ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    );
  }

  // Waves Shape (Smooth animated wave)
  if (shape === 'waves') {
    const points = barHeights.map((h, i) => {
      const x = (i / (barHeights.length - 1)) * 100;
      const y = isPlaying ? 20 + ((h - 50) / 3) : 20;
      return `${x},${y}`;
    });
    const pathData = `M 0,20 L ${points.join(' L ')} L 100,20`;
    
    return (
      <div className={cn('flex items-center justify-center h-10 overflow-hidden', className)}>
        <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d={pathData}
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-75"
            style={{
              filter: isPlaying ? 'url(#glow)' : 'none',
            }}
          />
          {/* Fill under the wave */}
          <path
            d={`${pathData} L 100,40 L 0,40 Z`}
            fill="url(#waveGradient)"
            opacity={isPlaying ? 0.2 : 0.05}
            className="transition-all duration-75"
          />
        </svg>
      </div>
    );
  }

  // Dots Shape (Bouncing dots)
  if (shape === 'dots') {
    return (
      <div className={cn('flex items-center justify-center gap-2 h-8', className)}>
        {dotSizes.map((size, index) => (
          <div
            key={index}
            className={cn(
              'rounded-full transition-all duration-100',
              isPlaying ? 'bg-primary' : 'bg-primary/30'
            )}
            style={{
              width: isPlaying ? `${size + 4}px` : '6px',
              height: isPlaying ? `${size + 4}px` : '6px',
              boxShadow: isPlaying ? `0 0 ${size * 2}px hsl(var(--primary) / 0.6)` : 'none',
              transform: isPlaying ? `translateY(${(size - 5) * 2}px)` : 'translateY(0)',
            }}
          />
        ))}
      </div>
    );
  }

  // Pulse Shape (Circular pulse)
  if (shape === 'pulse') {
    return (
      <div className={cn('flex items-center justify-center h-8', className)}>
        <div className="relative">
          {/* Outer pulse rings */}
          {[0, 1, 2].map((ring) => (
            <div
              key={ring}
              className="absolute inset-0 rounded-full border-2 border-primary/40"
              style={{
                transform: isPlaying ? `scale(${pulseScale + ring * 0.3})` : 'scale(1)',
                opacity: isPlaying ? 0.6 - ring * 0.2 : 0.3,
                transition: 'all 0.1s ease-out',
                width: '24px',
                height: '24px',
                marginLeft: `-${12 + ring * 6}px`,
                marginTop: `-${12 + ring * 6}px`,
                left: '50%',
                top: '50%',
              }}
            />
          ))}
          {/* Center dot */}
          <div
            className={cn(
              'w-6 h-6 rounded-full transition-all duration-100',
              isPlaying ? 'bg-primary' : 'bg-primary/30'
            )}
            style={{
              transform: isPlaying ? `scale(${pulseScale})` : 'scale(1)',
              boxShadow: isPlaying ? '0 0 20px hsl(var(--primary) / 0.8)' : 'none',
            }}
          />
        </div>
      </div>
    );
  }

  // Spectrum Shape (Mirrored bars)
  if (shape === 'spectrum') {
    const halfBars = barHeights.slice(0, 8);
    return (
      <div className={cn('flex items-center justify-center gap-[2px] h-8', className)}>
        {/* Left side (mirrored) */}
        {[...halfBars].reverse().map((height, index) => (
          <div
            key={`left-${index}`}
            className={cn(
              'w-[2px] rounded-full transition-all duration-75',
              isPlaying ? 'bg-primary' : 'bg-primary/30'
            )}
            style={{
              height: `${isPlaying ? height * 0.8 : 20}%`,
              boxShadow: isPlaying ? '0 0 4px hsl(var(--primary) / 0.5)' : 'none',
            }}
          />
        ))}
        {/* Center peak */}
        <div
          className={cn(
            'w-[3px] rounded-full transition-all duration-75',
            isPlaying ? 'bg-primary' : 'bg-primary/30'
          )}
          style={{
            height: `${isPlaying ? Math.max(...barHeights) : 25}%`,
            boxShadow: isPlaying ? '0 0 8px hsl(var(--primary))' : 'none',
          }}
        />
        {/* Right side */}
        {halfBars.map((height, index) => (
          <div
            key={`right-${index}`}
            className={cn(
              'w-[2px] rounded-full transition-all duration-75',
              isPlaying ? 'bg-primary' : 'bg-primary/30'
            )}
            style={{
              height: `${isPlaying ? height * 0.8 : 20}%`,
              boxShadow: isPlaying ? '0 0 4px hsl(var(--primary) / 0.5)' : 'none',
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

export default SoundwaveVisualizer;