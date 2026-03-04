import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipForward, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';

const FloatingMiniPlayer = () => {
  const {
    currentTrack, isPlaying, handlePlayPause, handleNext,
    showMiniPlayer, setShowMiniPlayer,
  } = useMusicPlayer();

  const navigate = useNavigate();
  const location = useLocation();
  const isOnHomePage = location.pathname === '/';

  // Drag state
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);

  // Initialize position to bottom-right
  useEffect(() => {
    if (position.x === -1) {
      setPosition({
        x: window.innerWidth - 340,
        y: window.innerHeight - 120,
      });
    }
  }, []);

  // Clamp position on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 300),
        y: Math.min(prev.y, window.innerHeight - 90),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse/Touch drag handlers
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!playerRef.current) return;
    setIsDragging(true);
    hasDragged.current = false;
    const rect = playerRef.current.getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    hasDragged.current = true;
    const newX = Math.max(0, Math.min(clientX - dragOffset.current.x, window.innerWidth - 300));
    const newY = Math.max(0, Math.min(clientY - dragOffset.current.y, window.innerHeight - 90));
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    const onEnd = () => handleDragEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleExpand = () => {
    if (hasDragged.current) return;
    // Navigate to home page where the full player lives
    if (!isOnHomePage) navigate('/');
  };

  // Don't show if no track, hidden, or on home page (full player visible)
  if (!currentTrack || !showMiniPlayer || isOnHomePage) return null;

  const node = (
    <div
      ref={playerRef}
      className={cn(
        "fixed z-[9998] select-none animate-fade-in",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging ? 'none' : 'box-shadow 0.3s ease',
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        handleDragStart(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
    >
      <div className={cn(
        "flex items-center gap-3 p-2.5 pr-3 rounded-2xl border",
        "bg-card/80 backdrop-blur-xl border-border/40",
        "shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)_inset]",
        "hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)_inset]",
        "transition-shadow duration-300",
        "w-[300px]",
      )}>
        {/* Album art */}
        <div
          className="relative shrink-0 group"
          onClick={handleExpand}
        >
          <div className={cn(
            "absolute -inset-0.5 rounded-xl blur-sm transition-opacity",
            isPlaying ? "opacity-60" : "opacity-0",
          )} style={{ background: 'var(--theme-gradient, hsl(var(--primary)))' }} />
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="relative w-12 h-12 rounded-xl object-cover"
          />
          <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0" onClick={handleExpand}>
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {currentTrack.title}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {currentTrack.channel}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 touch-manipulation text-primary-foreground"
            style={{ background: 'var(--theme-gradient, hsl(var(--primary)))' }}
          >
            {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-foreground hover:text-primary hover:bg-secondary/50 transition-all active:scale-90 touch-manipulation"
          >
            <SkipForward className="w-4 h-4" fill="currentColor" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMiniPlayer(false); }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90 touch-manipulation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

export default FloatingMiniPlayer;
