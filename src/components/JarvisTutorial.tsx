import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TutorialStep {
  title: string;
  message: string;
  // Position the card near the highlighted element
  highlight: 'center' | 'top-right' | 'left' | 'bottom';
  // Arrow pointing direction
  pointTo?: string;
}

const steps: TutorialStep[] = [
  {
    title: "Welcome to NYRA!",
    message: "Hey there! I'm JARVIS, your personal assistant. Let me give you a quick tour of NYRA so you can start vibing right away!",
    highlight: 'center',
  },
  {
    title: "Search Bar",
    message: "This is your search bar — right here at the top! Type any song, artist, or keyword and press Enter to find music instantly.",
    highlight: 'top-right',
    pointTo: 'search',
  },
  {
    title: "Sidebar Navigation",
    message: "Over here on the left is your sidebar. You'll find Home, Artists, Playlists, Favorites, and more. On mobile, tap the menu icon to open it!",
    highlight: 'left',
    pointTo: 'sidebar',
  },
  {
    title: "Playlists",
    message: "Head to Playlists from the sidebar to create your own collections. Add songs, reorder them with drag & drop, and shuffle through your jams!",
    highlight: 'left',
    pointTo: 'playlists',
  },
  {
    title: "AI DJ",
    message: "Try out the AI DJ! Tell it your mood and it'll create the perfect playlist for you. It's like having your own personal DJ.",
    highlight: 'left',
    pointTo: 'ai-dj',
  },
  {
    title: "Settings",
    message: "Head to Settings to set your username, upload an avatar (PNG or GIF!), change your password, and customize your theme. Make NYRA yours!",
    highlight: 'left',
    pointTo: 'settings',
  },
  {
    title: "Music Player",
    message: "When you play a song, the player appears at the bottom. Control playback, add to queue, view lyrics, and more. Now go explore — enjoy the music! 🎶",
    highlight: 'bottom',
    pointTo: 'player',
  },
];

interface JarvisTutorialProps {
  onComplete: () => void;
}

const JarvisTutorial = ({ onComplete }: JarvisTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

  // Fetch admin/JARVIS avatar from app_settings or fallback to first admin profile
  useEffect(() => {
    const fetchJarvisAvatar = async () => {
      try {
        // First try app_settings for a custom JARVIS avatar
        const { data: setting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'jarvis_avatar')
          .maybeSingle();

        if (setting?.value && typeof setting.value === 'string') {
          setAdminAvatar(setting.value);
          return;
        }

        // Fallback: try to find an admin profile avatar
        // Query user_roles (will only work for admin users, silently fail for others)
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1);

        if (adminRoles && adminRoles.length > 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('user_id', adminRoles[0].user_id)
            .maybeSingle();

          if (profile?.avatar_url) {
            setAdminAvatar(profile.avatar_url);
          }
        }
      } catch (err) {
        console.warn('Could not fetch JARVIS avatar:', err);
      }
    };
    fetchJarvisAvatar();
  }, []);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 300);
  }, []);

  // Highlight sidebar items
  useEffect(() => {
    const step = steps[currentStep];
    // Remove previous highlights
    document.querySelectorAll('[data-tutorial-highlight]').forEach(el => {
      (el as HTMLElement).removeAttribute('data-tutorial-highlight');
      (el as HTMLElement).style.removeProperty('position');
      (el as HTMLElement).style.removeProperty('z-index');
      (el as HTMLElement).style.removeProperty('box-shadow');
    });

    if (step.pointTo === 'search') {
      const searchEl = document.querySelector('header input');
      if (searchEl) {
        const parent = searchEl.closest('header');
        if (parent) {
          (parent as HTMLElement).setAttribute('data-tutorial-highlight', 'true');
          (parent as HTMLElement).style.zIndex = '101';
          (parent as HTMLElement).style.boxShadow = '0 0 0 4px hsl(var(--primary) / 0.5), 0 0 30px hsl(var(--primary) / 0.3)';
        }
      }
    } else if (step.pointTo === 'sidebar') {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        (sidebar as HTMLElement).setAttribute('data-tutorial-highlight', 'true');
        (sidebar as HTMLElement).style.zIndex = '101';
        (sidebar as HTMLElement).style.boxShadow = '0 0 0 4px hsl(var(--primary) / 0.5), 0 0 30px hsl(var(--primary) / 0.3)';
      }
    } else if (step.pointTo === 'playlists' || step.pointTo === 'ai-dj' || step.pointTo === 'settings') {
      const labelMap: Record<string, string> = { playlists: 'Playlists', 'ai-dj': 'AI DJ', settings: 'Settings' };
      const buttons = document.querySelectorAll('aside button');
      buttons.forEach(btn => {
        if (btn.textContent?.trim() === labelMap[step.pointTo!]) {
          (btn as HTMLElement).setAttribute('data-tutorial-highlight', 'true');
          (btn as HTMLElement).style.position = 'relative';
          (btn as HTMLElement).style.zIndex = '101';
          (btn as HTMLElement).style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.6), 0 0 20px hsl(var(--primary) / 0.4)';
        }
      });
      // Also bring sidebar above backdrop
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        (sidebar as HTMLElement).style.zIndex = '101';
      }
    }

    return () => {
      document.querySelectorAll('[data-tutorial-highlight]').forEach(el => {
        (el as HTMLElement).removeAttribute('data-tutorial-highlight');
        (el as HTMLElement).style.removeProperty('position');
        (el as HTMLElement).style.removeProperty('z-index');
        (el as HTMLElement).style.removeProperty('box-shadow');
      });
      // Reset sidebar z-index
      const sidebar = document.querySelector('aside');
      if (sidebar) (sidebar as HTMLElement).style.removeProperty('z-index');
    };
  }, [currentStep]);

  // Typing effect
  useEffect(() => {
    setTypedText('');
    setIsTyping(true);
    const message = steps[currentStep].message;
    let i = 0;
    const interval = setInterval(() => {
      if (i < message.length) {
        setTypedText(message.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    setIsVisible(false);
    // Cleanup highlights
    document.querySelectorAll('[data-tutorial-highlight]').forEach(el => {
      (el as HTMLElement).removeAttribute('data-tutorial-highlight');
      (el as HTMLElement).style.removeProperty('position');
      (el as HTMLElement).style.removeProperty('z-index');
      (el as HTMLElement).style.removeProperty('box-shadow');
    });
    const sidebar = document.querySelector('aside');
    if (sidebar) (sidebar as HTMLElement).style.removeProperty('z-index');
    const header = document.querySelector('header');
    if (header) (header as HTMLElement).style.removeProperty('z-index');
    setTimeout(onComplete, 400);
  };

  const step = steps[currentStep];

  // Position card based on what we're highlighting
  const getCardPosition = () => {
    switch (step.highlight) {
      case 'top-right':
        return 'top-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-8';
      case 'left':
        return 'top-1/2 -translate-y-1/2 left-4 md:left-72';
      case 'bottom':
        return 'bottom-24 left-1/2 -translate-x-1/2';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-400 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop - partially transparent so highlighted elements show through */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={handleClose} />

      {/* JARVIS Card */}
      <div className={`fixed ${getCardPosition()} w-[88vw] max-w-md bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-5 md:p-6 transition-all duration-500 z-[102] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Close */}
        <button onClick={handleClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* JARVIS Header with Avatar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {adminAvatar ? (
              <img
                src={adminAvatar}
                alt="JARVIS"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/50">
                <span className="text-primary font-bold text-sm">J</span>
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
          </div>
          <div>
            <span className="text-sm font-bold text-primary">JARVIS</span>
            <p className="text-[10px] text-muted-foreground">Your Personal Guide</p>
          </div>
          <span className="text-[10px] text-muted-foreground ml-auto bg-secondary px-2 py-0.5 rounded-full">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-foreground mb-2">{step.title}</h2>

        {/* Typed Message */}
        <p className="text-muted-foreground text-sm leading-relaxed min-h-[3.5rem]">
          {typedText}
          {isTyping && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 my-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-5 bg-primary' : i < currentStep ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-muted-foreground text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>

          <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground text-xs">
            Skip Tour
          </Button>

          <Button size="sm" onClick={handleNext} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
            {currentStep === steps.length - 1 ? "Let's Go! 🎵" : 'Next'} <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JarvisTutorial;
