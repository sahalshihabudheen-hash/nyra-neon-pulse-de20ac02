import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Volume2, VolumeX } from 'lucide-react';

const MaintenancePage = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio('https://files.catbox.moe/jfdd5u.wav');
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    // Auto-play with user interaction fallback
    const playAudio = () => {
      audio.play().catch(() => {
        // Auto-play blocked, will play on user interaction
        const handleClick = () => {
          audio.play();
          document.removeEventListener('click', handleClick);
        };
        document.addEventListener('click', handleClick);
      });
    };
    playAudio();

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl -bottom-32 -right-32 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="absolute top-6 right-6 p-3 rounded-full bg-secondary/80 hover:bg-secondary transition-colors z-10"
      >
        {muted ? (
          <VolumeX className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Volume2 className="w-5 h-5 text-primary" />
        )}
      </button>

      <div className="relative z-10 text-center max-w-lg">
        {/* Spinning gear */}
        <div className="mx-auto w-24 h-24 mb-8 relative">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Settings className="w-12 h-12 text-primary animate-spin" style={{ animationDuration: '8s' }} />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
          Under Maintenance
        </h1>
        
        <p className="text-lg text-muted-foreground mb-2">
          JARVIS is working faster than you think
        </p>
        
        <p className="text-sm text-muted-foreground/70 mb-8">
          We're upgrading our systems to serve you better. Please check back soon.
        </p>

        {/* Animated progress bar */}
        <div className="w-full max-w-xs mx-auto h-1.5 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full animate-pulse"
            style={{
              width: '60%',
              animation: 'maintenance-progress 2s ease-in-out infinite alternate',
            }}
          />
        </div>

        <style>{`
          @keyframes maintenance-progress {
            0% { width: 20%; margin-left: 0; }
            100% { width: 60%; margin-left: 40%; }
          }
        `}</style>

        <p className="text-xs text-muted-foreground/50 mt-8">
          If you believe you should have access, contact the administrator.
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;
