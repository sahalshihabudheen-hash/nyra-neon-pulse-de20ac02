import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SoundwaveVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

const SoundwaveVisualizer = ({ isPlaying, className }: SoundwaveVisualizerProps) => {
  const [barHeights, setBarHeights] = useState<number[]>(Array(12).fill(20));
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!isPlaying) {
      setBarHeights(Array(12).fill(20));
      return;
    }

    const animate = () => {
      // Generate random heights to simulate audio visualization
      const newHeights = Array(12).fill(0).map(() => {
        return Math.random() * 80 + 20; // Random height between 20-100%
      });
      setBarHeights(newHeights);
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(animate, 100); // Update every 100ms for smooth animation
      });
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className={cn('flex items-end justify-center gap-0.5 h-8', className)}>
      {barHeights.map((height, index) => (
        <div
          key={index}
          className={cn(
            'w-1 rounded-full transition-all duration-100',
            isPlaying ? 'bg-primary' : 'bg-primary/30'
          )}
          style={{
            height: `${isPlaying ? height : 20}%`,
            animationDelay: `${index * 50}ms`,
          }}
        />
      ))}
    </div>
  );
};

export default SoundwaveVisualizer;
