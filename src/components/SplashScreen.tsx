import { useEffect, useState } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const { settings } = useAppSettings();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background ${
        isExiting ? 'animate-splash-exit' : ''
      }`}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
      </div>

      {/* Logo */}
      <h1
        className="text-7xl md:text-9xl font-extrabold neon-text animate-fade-in-up tracking-tight"
        style={{ animationDelay: '0.2s' }}
      >
        {settings.app_name}
      </h1>

      {/* Tagline */}
      <p
        className="text-xl md:text-2xl text-muted-foreground mt-4 animate-fade-in-up tracking-widest uppercase"
        style={{ animationDelay: '0.5s' }}
      >
        {settings.app_tagline}
      </p>

      {/* Soundwave Animation */}
      <div
        className="flex items-end gap-1 mt-8 h-12 animate-fade-in-up"
        style={{ animationDelay: '0.8s' }}
      >
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="w-2 bg-primary rounded-full soundwave-bar"
            style={{ height: '100%' }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
