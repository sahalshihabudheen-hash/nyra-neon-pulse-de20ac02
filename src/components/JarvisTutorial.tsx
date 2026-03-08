import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface TutorialStep {
  title: string;
  message: string;
  highlight: 'center' | 'top-right' | 'left' | 'bottom' | 'page-center';
  pointTo?: string;
  navigateTo?: string; // Navigate to this route when step becomes active
}

const steps: TutorialStep[] = [
  {
    title: "Welcome to NYRA!",
    message: "Hey there! I'm JARVIS, your personal assistant. Let me give you a quick tour of NYRA so you can start vibing right away! I'll walk you through each section.",
    highlight: 'center',
    navigateTo: '/',
  },
  {
    title: "🔍 Search Bar",
    message: "See this search bar at the top? Type any song name, artist, or keyword and hit Enter. NYRA will find it for you instantly from millions of tracks!",
    highlight: 'top-right',
    pointTo: 'search',
    navigateTo: '/',
  },
  {
    title: "📋 Sidebar Navigation",
    message: "This is your sidebar — your command center! It has links to Home, Artists, Playlists, Favorites, AI DJ, and Settings. Let me show you each one...",
    highlight: 'left',
    pointTo: 'sidebar',
    navigateTo: '/',
  },
  {
    title: "🎵 Playlists",
    message: "Welcome to Playlists! Here you can create your own music collections. Tap '+ New Playlist' to create one, then search for songs and add them. You can drag to reorder and shuffle your jams!",
    highlight: 'page-center',
    navigateTo: '/playlists',
  },
  {
    title: "🤖 AI DJ",
    message: "This is the AI DJ! Just tell it your mood — like 'chill vibes' or 'workout energy' — and it'll generate the perfect playlist for you. It's like having your own personal DJ!",
    highlight: 'page-center',
    navigateTo: '/ai-dj',
  },
  {
    title: "❤️ Favorites",
    message: "Your Favorites page! Whenever you hear a song you love, tap the heart icon on any track. All your liked songs show up here for easy access.",
    highlight: 'page-center',
    navigateTo: '/favorites',
  },
  {
    title: "🎤 Artists",
    message: "Discover artists here! Browse through profiles, check out their albums, and listen to their tracks. You can even become an artist yourself!",
    highlight: 'page-center',
    navigateTo: '/artists',
  },
  {
    title: "⚙️ Settings",
    message: "This is your Settings page! Here you can set your username, upload an avatar (PNG or GIF), change your password, pick a theme, customize gradients, and tweak player options. Make NYRA yours!",
    highlight: 'page-center',
    navigateTo: '/settings',
  },
  {
    title: "🎶 You're All Set!",
    message: "That's the tour! Head back home, search for your favorite song, and start listening. The music player will appear at the bottom when you play a track. Enjoy NYRA! 🎵",
    highlight: 'center',
    navigateTo: '/',
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
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch admin/JARVIS avatar
  useEffect(() => {
    const fetchJarvisAvatar = async () => {
      try {
        const { data: setting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'jarvis_avatar')
          .maybeSingle();

        if (setting?.value && typeof setting.value === 'string') {
          setAdminAvatar(setting.value);
          return;
        }

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

  // Navigate to the correct page for each step
  useEffect(() => {
    const step = steps[currentStep];
    if (step.navigateTo && location.pathname !== step.navigateTo) {
      navigate(step.navigateTo);
    }
  }, [currentStep, navigate, location.pathname]);

  // Highlight UI elements
  useEffect(() => {
    const step = steps[currentStep];
    const cleanup = () => {
      document.querySelectorAll('[data-tutorial-highlight]').forEach(el => {
        (el as HTMLElement).removeAttribute('data-tutorial-highlight');
        (el as HTMLElement).style.removeProperty('position');
        (el as HTMLElement).style.removeProperty('z-index');
        (el as HTMLElement).style.removeProperty('box-shadow');
      });
      const sidebar = document.querySelector('aside');
      if (sidebar) (sidebar as HTMLElement).style.removeProperty('z-index');
    };

    cleanup();

    // Delay highlight to let page render after navigation
    const timer = setTimeout(() => {
      if (step.pointTo === 'search') {
        const header = document.querySelector('header');
        if (header) {
          (header as HTMLElement).setAttribute('data-tutorial-highlight', 'true');
          (header as HTMLElement).style.zIndex = '101';
          (header as HTMLElement).style.boxShadow = '0 0 0 4px hsl(var(--primary) / 0.5), 0 0 30px hsl(var(--primary) / 0.3)';
        }
      } else if (step.pointTo === 'sidebar') {
        const sidebar = document.querySelector('aside');
        if (sidebar) {
          (sidebar as HTMLElement).setAttribute('data-tutorial-highlight', 'true');
          (sidebar as HTMLElement).style.zIndex = '101';
          (sidebar as HTMLElement).style.boxShadow = '0 0 0 4px hsl(var(--primary) / 0.5), 0 0 30px hsl(var(--primary) / 0.3)';
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      cleanup();
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

  const handleClose = useCallback(() => {
    setIsVisible(false);
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
    // Navigate home before completing
    navigate('/');
    setTimeout(onComplete, 400);
  }, [onComplete, navigate]);

  const step = steps[currentStep];

  const getCardPosition = () => {
    switch (step.highlight) {
      case 'top-right':
        return 'top-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-8';
      case 'left':
        return 'top-1/2 -translate-y-1/2 left-4 md:left-72';
      case 'bottom':
        return 'bottom-24 left-1/2 -translate-x-1/2';
      case 'page-center':
        return 'top-1/3 left-1/2 -translate-x-1/2 md:left-[calc(50%+8rem)] md:-translate-x-1/2';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-400 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
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
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
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
