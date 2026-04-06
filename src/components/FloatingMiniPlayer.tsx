import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipForward, SkipBack, X, Maximize2, Music2, Download, Loader2, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import SoundwaveVisualizer from '@/components/SoundwaveVisualizer';
import LyricsDrawer from '@/components/LyricsDrawer';
import { useDownloadManager } from '@/contexts/DownloadManagerContext';

const PLAYER_WIDTH = 320;
const PLAYER_HEIGHT = 96;
const EDGE_PADDING = 12;

const FloatingMiniPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    handlePlayPause,
    handleNext,
    handlePrevious,
    ytPlayerRef,
    audioRef,
    showMiniPlayer,
    setShowMiniPlayer,
  } = useMusicPlayer();

  const { startDownload, isDownloading } = useDownloadManager();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide mini player on pages that have their own full player
  const hasFullPlayer = location.pathname === '/' || location.pathname.startsWith('/playlist/') || location.pathname === '/favorites';

  const [position, setPosition] = useState(() => ({
    x: Math.max(EDGE_PADDING, window.innerWidth - PLAYER_WIDTH - 24),
    y: Math.max(EDGE_PADDING, window.innerHeight - PLAYER_HEIGHT - 24),
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const dragOffset = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const shouldShow = Boolean(currentTrack && isPlaying && showMiniPlayer && !hasFullPlayer);

  useEffect(() => {
    if (shouldShow) {
      setIsRendered(true);
      setIsExiting(false);
      return;
    }

    if (isRendered) {
      setIsExiting(true);
      const timeout = window.setTimeout(() => {
        setIsRendered(false);
        setIsExiting(false);
      }, 220);
      return () => window.clearTimeout(timeout);
    }
  }, [shouldShow, isRendered]);

  // Clamp position on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(EDGE_PADDING, Math.min(prev.x, window.innerWidth - PLAYER_WIDTH - EDGE_PADDING)),
        y: Math.max(EDGE_PADDING, Math.min(prev.y, window.innerHeight - PLAYER_HEIGHT - EDGE_PADDING)),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync mini-player progress with global audio/youtube player
  useEffect(() => {
    if (!currentTrack) {
      setProgress(0);
      setDuration(0);
      return;
    }

    const updateProgress = () => {
      if (audioRef.current && audioRef.current.src && !Number.isNaN(audioRef.current.duration)) {
        setProgress(audioRef.current.currentTime || 0);
        setDuration(audioRef.current.duration || 0);
        return;
      }

      if (ytPlayerRef.current) {
        try {
          const current = ytPlayerRef.current.getCurrentTime?.() || 0;
          const total = ytPlayerRef.current.getDuration?.() || 0;
          setProgress(current);
          setDuration(total);
        } catch {
          // player not ready yet
        }
      }
    };

    updateProgress();
    const interval = window.setInterval(updateProgress, 250);
    return () => window.clearInterval(interval);
  }, [currentTrack?.id, isPlaying, audioRef, ytPlayerRef]);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!playerRef.current) return;
    setIsDragging(true);
    hasDragged.current = false;
    const rect = playerRef.current.getBoundingClientRect();
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      hasDragged.current = true;

      const newX = Math.max(
        EDGE_PADDING,
        Math.min(clientX - dragOffset.current.x, window.innerWidth - PLAYER_WIDTH - EDGE_PADDING),
      );
      const newY = Math.max(
        EDGE_PADDING,
        Math.min(clientY - dragOffset.current.y, window.innerHeight - PLAYER_HEIGHT - EDGE_PADDING),
      );

      setPosition({ x: newX, y: newY });
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleExpand = () => {
    if (hasDragged.current) return;
    navigate('/');
  };

  const progressPercent = useMemo(() => {
    if (!duration || Number.isNaN(duration)) return 0;
    return Math.min(100, (progress / duration) * 100);
  }, [progress, duration]);

  if (!isRendered || !currentTrack) return null;

  const node = (
    <div
      ref={playerRef}
      className={cn(
        'fixed z-[9998] w-[calc(100vw-24px)] max-w-[320px] select-none',
        isDragging ? 'cursor-grabbing' : 'cursor-default',
        isExiting ? 'animate-fade-out' : 'animate-fade-in',
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/60 glass-premium shadow-2xl">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleDragStart(e.clientX, e.clientY);
            }}
            onTouchStart={(e) => {
              if (!e.touches[0]) return;
              handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onClick={handleExpand}
            className={cn(
              'group relative flex items-center gap-3 min-w-0 flex-1 text-left rounded-xl p-1 transition-colors',
              isDragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
          >
            <div className="relative shrink-0">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="h-12 w-12 rounded-xl object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-xl bg-background/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="h-3.5 w-3.5 text-foreground" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground leading-tight">{currentTrack.title}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <p className="truncate text-xs text-muted-foreground">{currentTrack.channel}</p>
                <SoundwaveVisualizer isPlaying={isPlaying} className="h-3 w-8 shrink-0" shape="bars" />
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-foreground hover:text-primary hover:bg-secondary/70 transition-all active:scale-95"
              aria-label="Previous track"
            >
              <SkipBack className="h-4 w-4" fill="currentColor" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
              className="h-9 w-9 rounded-full flex items-center justify-center text-primary-foreground bg-primary hover:opacity-90 transition-all active:scale-95"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-foreground hover:text-primary hover:bg-secondary/70 transition-all active:scale-95"
              aria-label="Next track"
            >
              <SkipForward className="h-4 w-4" fill="currentColor" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentTrack) {
                  startDownload({ id: currentTrack.id, title: currentTrack.title, thumbnail: currentTrack.thumbnail });
                }
              }}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all active:scale-95"
              aria-label="Download"
            >
              {currentTrack && isDownloading(currentTrack.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentTrack) {
                  const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-embed?id=${currentTrack.id}&title=${encodeURIComponent(currentTrack.title)}&channel=${encodeURIComponent(currentTrack.channel)}&thumbnail=${encodeURIComponent(currentTrack.thumbnail)}`;
                  navigator.clipboard.writeText(shareUrl);
                  const { toast } = require('sonner');
                  toast.success('Share link copied!');
                }
              }}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all active:scale-95"
              aria-label="Share"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLyricsOpen(!lyricsOpen);
              }}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-all active:scale-95",
                lyricsOpen
                  ? "text-primary bg-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              )}
              aria-label="Lyrics"
            >
              <Music2 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMiniPlayer(false);
              }}
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all active:scale-95"
              aria-label="Close mini player"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="h-1 w-full bg-secondary/70">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(node, document.body)}
      <LyricsDrawer isOpen={lyricsOpen} onClose={() => setLyricsOpen(false)} />
    </>
  );
};

export default FloatingMiniPlayer;
