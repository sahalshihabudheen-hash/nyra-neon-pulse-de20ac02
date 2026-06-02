import { Music2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaylistGridPhotoProps {
  thumbnails: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PlaylistGridPhoto = ({ thumbnails, className, size = 'md' }: PlaylistGridPhotoProps) => {
  const displayThumbnails = thumbnails.slice(0, 4);
  const count = displayThumbnails.length;

  const sizeClasses = {
    sm: 'w-16 h-16 rounded-lg',
    md: 'w-24 h-24 md:w-32 md:h-32 rounded-2xl',
    lg: 'w-48 h-48 md:w-64 md:h-64 rounded-[2rem]',
  };

  if (count === 0) {
    return (
      <div className={cn(
        "bg-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden",
        sizeClasses[size],
        className
      )}>
        <Music2 className={cn(
           size === 'sm' ? "w-8 h-8" : size === 'md' ? "w-12 h-12" : "w-24 h-24"
        )} />
      </div>
    );
  }

  // If we have 4 or more thumbnails, show the 2x2 grid
  if (count >= 4) {
    return (
      <div className={cn(
        "grid grid-cols-2 grid-rows-2 shrink-0 overflow-hidden shadow-2xl",
        sizeClasses[size],
        className
      )}>
        {displayThumbnails.map((src, i) => (
          <img 
            key={i} 
            src={src} 
            alt="Playlist cover" 
            className="w-full h-full object-cover"
          />
        ))}
      </div>
    );
  }

  // If we have between 1 and 3 thumbnails, show the first one prominently
  return (
    <div className={cn(
      "shrink-0 overflow-hidden shadow-2xl",
      sizeClasses[size],
      className
    )}>
      <img 
        src={displayThumbnails[0]} 
        alt="Playlist cover" 
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default PlaylistGridPhoto;
