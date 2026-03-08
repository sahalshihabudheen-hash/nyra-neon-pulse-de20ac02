import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import jarvisAvatar from '@/assets/jarvis-avatar.gif';

interface TutorialStep {
  title: string;
  message: string;
  navigateTo?: string;
  // CSS selector(s) to highlight with arrows
  highlightSelectors?: string[];
  // Labels for each arrow
  highlightLabels?: string[];
  // Card position
  cardPosition: 'center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'mid-left';
}

const steps: TutorialStep[] = [
  {
    title: "Welcome to NYRA!",
    message: "Hey there! I'm JARVIS, your personal assistant. Let me give you a quick tour of NYRA so you can start vibing right away! I'll walk you through each section.",
    cardPosition: 'center',
    navigateTo: '/',
  },
  {
    title: "🔍 Search for Music",
    message: "This is your search bar! Type any song name, artist, or keyword here and press Enter. NYRA will find it for you instantly from millions of tracks!",
    cardPosition: 'bottom-left',
    navigateTo: '/',
    highlightSelectors: ['header .relative:has(input)'],
    highlightLabels: ['Type your search here'],
  },
  {
    title: "📋 Your Sidebar",
    message: "This is your sidebar — your command center! Each icon takes you to a different section. Let me walk you through the important ones...",
    cardPosition: 'mid-left',
    navigateTo: '/',
    highlightSelectors: ['aside nav'],
    highlightLabels: ['Navigate from here'],
  },
  {
    title: "🎵 Create Playlists",
    message: "This is your Playlists page! Tap the 'Create Playlist' button in the top-right to make a new collection. Then go search for songs and add them to your playlist!",
    cardPosition: 'bottom-left',
    navigateTo: '/playlists',
    highlightSelectors: ['button:has(.lucide-plus)', 'main h1'],
    highlightLabels: ['Tap here to create a playlist', 'Your playlists appear here'],
  },
  {
    title: "🤖 AI DJ — Your Mood, Your Music",
    message: "Welcome to AI DJ! Pick a quick mood button above, or type exactly how you're feeling in the text box below. Hit 'Generate AI Playlist' and the AI will create a perfect playlist for your vibe!",
    cardPosition: 'bottom-left',
    navigateTo: '/ai-dj',
    highlightSelectors: ['button:has(.lucide-sparkles):not(aside button)', 'input[placeholder*="mood"], input[placeholder*="feeling"], textarea'],
    highlightLabels: ['Generate your playlist', 'Type your mood here'],
  },
  {
    title: "❤️ Your Favorites",
    message: "This is your Favorites! Whenever you hear a song you love, tap the heart icon ❤️ on any track card. All your liked songs will show up right here.",
    cardPosition: 'center',
    navigateTo: '/favorites',
  },
  {
    title: "🎤 Discover Artists",
    message: "Browse artists here! Check out their profiles, albums, and tracks. Want to share your own music? Tap 'Become an Artist' to get started!",
    cardPosition: 'bottom-right',
    navigateTo: '/artists',
    highlightSelectors: ['a[href="/become-artist"], button:has(.lucide-mic)'],
    highlightLabels: ['Become an artist'],
  },
  {
    title: "⚙️ Your Settings",
    message: "This is Settings! Set your username, upload a profile picture (PNG or GIF), change your password, pick a theme color, and customize gradients. Make NYRA truly yours!",
    cardPosition: 'bottom-right',
    navigateTo: '/settings',
    highlightSelectors: ['[class*="avatar"], .relative:has(img[alt="Avatar"])'],
    highlightLabels: ['Upload your avatar here'],
  },
  {
    title: "🎶 You're All Set!",
    message: "That's the tour! Head back home, search for your favorite song, and start listening. The music player will appear at the bottom when you play a track. Enjoy NYRA! 🎵",
    cardPosition: 'center',
    navigateTo: '/',
  },
];

// Pulsing arrow component that points to an element
const HighlightArrow = ({ targetRect, label, index }: { targetRect: DOMRect; label: string; index: number }) => {
  const arrowLeft = targetRect.left + targetRect.width / 2;
  const clampedLeft = Math.min(Math.max(arrowLeft, 100), window.innerWidth - 100);
  const showAbove = targetRect.top > 160;

  return (
    <div
      className="fixed z-[103] flex flex-col items-center pointer-events-none animate-bounce"
      style={{
        top: showAbove ? targetRect.top - 60 : targetRect.bottom + 8,
        left: clampedLeft,
        transform: 'translateX(-50%)',
        animationDelay: `${index * 200}ms`,
        maxWidth: '90vw',
      }}
    >
      {showAbove ? (
        <>
          <span className="text-[11px] font-bold text-primary bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/40 shadow-lg shadow-primary/20 text-center mb-1 max-w-[200px] truncate">
            {label}
          </span>
          <svg width="20" height="16" viewBox="0 0 20 16" className="text-primary drop-shadow-lg">
            <path d="M10 16L2 4h16L10 16z" fill="currentColor" />
          </svg>
        </>
      ) : (
        <>
          <svg width="20" height="16" viewBox="0 0 20 16" className="text-primary drop-shadow-lg">
            <path d="M10 0L18 12H2L10 0z" fill="currentColor" />
          </svg>
          <span className="text-[11px] font-bold text-primary bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-primary/40 shadow-lg shadow-primary/20 text-center mt-1 max-w-[200px] truncate">
            {label}
          </span>
        </>
      )}
    </div>
  );
};

interface JarvisTutorialProps {
  onComplete: () => void;
}

// Web Audio API helpers
const createAudioContext = () => {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

const playClickSound = () => {
  try {
    const ctx = createAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
};

const JarvisTutorial = ({ onComplete }: JarvisTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [highlightRects, setHighlightRects] = useState<{ rect: DOMRect; label: string }[]>([]);
  const bgAudioRef = useRef<{ ctx: AudioContext; nodes: AudioNode[] } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Start ambient background music
  useEffect(() => {
    let ctx: AudioContext;
    try {
      ctx = createAudioContext();
      const nodes: AudioNode[] = [];

      // Soft pad chord — C major (C4, E4, G4) with gentle detuning
      const frequencies = [261.63, 329.63, 392.0, 523.25];
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
      masterGain.connect(ctx.destination);
      nodes.push(masterGain);

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        // Gentle LFO for shimmer
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        oscGain.gain.setValueAtTime(0.25, ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(ctx.currentTime + i * 0.3);
        nodes.push(osc, oscGain);
      });

      // Slow LFO on master gain for breathing effect
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.02, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(masterGain.gain);
      lfo.start(ctx.currentTime);
      nodes.push(lfo, lfoGain);

      bgAudioRef.current = { ctx, nodes };
    } catch {}

    return () => {
      if (bgAudioRef.current) {
        try {
          const { ctx } = bgAudioRef.current;
          ctx.close();
        } catch {}
        bgAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 300);
  }, []);

  // Navigate to the correct page
  useEffect(() => {
    const step = steps[currentStep];
    if (step.navigateTo && location.pathname !== step.navigateTo) {
      navigate(step.navigateTo);
    }
  }, [currentStep, navigate, location.pathname]);

  // Find and highlight elements with arrows
  useEffect(() => {
    const step = steps[currentStep];

    // Clear previous highlights
    document.querySelectorAll('[data-tutorial-glow]').forEach(el => {
      (el as HTMLElement).style.removeProperty('box-shadow');
      (el as HTMLElement).style.removeProperty('z-index');
      (el as HTMLElement).style.removeProperty('position');
      (el as HTMLElement).removeAttribute('data-tutorial-glow');
    });
    setHighlightRects([]);

    if (!step.highlightSelectors?.length) return;

    // Wait for page to render after navigation
    const timer = setTimeout(() => {
      const rects: { rect: DOMRect; label: string }[] = [];

      step.highlightSelectors!.forEach((selector, i) => {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) {
          const rect = el.getBoundingClientRect();
          const label = step.highlightLabels?.[i] || '';
          rects.push({ rect, label });

          // Add glow to the element
          el.setAttribute('data-tutorial-glow', 'true');
          el.style.position = 'relative';
          el.style.zIndex = '101';
          el.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.6), 0 0 25px hsl(var(--primary) / 0.3)';
        }
      });

      // Bring sidebar above overlay if highlighting sidebar elements
      const sidebar = document.querySelector('aside');
      if (sidebar && step.highlightSelectors!.some(s => s.includes('aside') || s.includes('nav'))) {
        (sidebar as HTMLElement).style.zIndex = '101';
      }
      // Bring header above overlay if highlighting search
      const header = document.querySelector('header');
      if (header && step.highlightSelectors!.some(s => s.includes('header') || s.includes('input'))) {
        (header as HTMLElement).style.zIndex = '101';
      }

      setHighlightRects(rects);
    }, 500);

    return () => {
      clearTimeout(timer);
      document.querySelectorAll('[data-tutorial-glow]').forEach(el => {
        (el as HTMLElement).style.removeProperty('box-shadow');
        (el as HTMLElement).style.removeProperty('z-index');
        (el as HTMLElement).style.removeProperty('position');
        (el as HTMLElement).removeAttribute('data-tutorial-glow');
      });
      const sidebar = document.querySelector('aside');
      if (sidebar) (sidebar as HTMLElement).style.removeProperty('z-index');
      const header = document.querySelector('header');
      if (header) (header as HTMLElement).style.removeProperty('z-index');
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
    document.querySelectorAll('[data-tutorial-glow]').forEach(el => {
      (el as HTMLElement).style.removeProperty('box-shadow');
      (el as HTMLElement).style.removeProperty('z-index');
      (el as HTMLElement).style.removeProperty('position');
      (el as HTMLElement).removeAttribute('data-tutorial-glow');
    });
    const sidebar = document.querySelector('aside');
    if (sidebar) (sidebar as HTMLElement).style.removeProperty('z-index');
    const header = document.querySelector('header');
    if (header) (header as HTMLElement).style.removeProperty('z-index');
    navigate('/');
    setTimeout(onComplete, 400);
  }, [onComplete, navigate]);

  const step = steps[currentStep];

  const getCardPosition = () => {
    switch (step.cardPosition) {
      case 'bottom-right':
        return 'bottom-8 right-4 md:right-8';
      case 'bottom-left':
        return 'bottom-8 left-4 md:left-[calc(16rem+2rem)]';
      case 'mid-left':
        return 'top-1/3 left-4 md:left-[calc(16rem+2rem)]';
      case 'top-center':
        return 'top-24 left-1/2 -translate-x-1/2 md:left-[calc(50%+8rem)] md:-translate-x-1/2';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-400 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Highlight arrows pointing to elements */}
      {highlightRects.map((hr, i) => (
        <HighlightArrow key={i} targetRect={hr.rect} label={hr.label} index={i} />
      ))}

      {/* JARVIS Card */}
      <div className={`fixed ${getCardPosition()} w-[88vw] max-w-md bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-5 md:p-6 transition-all duration-500 z-[102] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {/* Close */}
        <button onClick={handleClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* JARVIS Header with Avatar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img
              src={jarvisAvatar}
              alt="JARVIS"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/50"
            />
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
