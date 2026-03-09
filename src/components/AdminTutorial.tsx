import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jarvisAvatar from '@/assets/jarvis-avatar.gif';

interface TutorialStep {
  title: string;
  message: string;
  highlightSelectors?: string[];
  highlightLabels?: string[];
  cardPosition: 'center' | 'bottom-right' | 'bottom-left' | 'top-center';
  tabToActivate?: string;
}

const steps: TutorialStep[] = [
  {
    title: "🛡️ Welcome, Admin!",
    message: "Hey! I'm JARVIS. Congrats on getting admin access! Let me walk you through the Admin Dashboard so you know how to manage everything. This is your command center.",
    cardPosition: 'center',
  },
  {
    title: "👥 Users Tab",
    message: "This is the Users tab — your main hub. Here you can see all registered users, their online status, locations, devices, VPN detection, and manage admin roles. Use the search and filters to find specific users quickly.",
    cardPosition: 'bottom-right',
    tabToActivate: 'users',
    highlightSelectors: ['[data-state="active"][value="users"], button[value="users"]'],
    highlightLabels: ['Users management'],
  },
  {
    title: "🔍 Search & Filters",
    message: "Use the search bar to find users by name, email, location, or ISP. You can also filter by online status, device type (Phone, Tablet, Laptop, Desktop), VPN usage, and country.",
    cardPosition: 'bottom-right',
    tabToActivate: 'users',
    highlightSelectors: ['input[placeholder*="Search"]'],
    highlightLabels: ['Search users here'],
  },
  {
    title: "🎵 Activity Tab",
    message: "The Activity tab shows the listening history of all users — what songs they played and when. Great for understanding what's trending on your platform!",
    cardPosition: 'bottom-right',
    tabToActivate: 'activity',
    highlightSelectors: ['[data-state="active"][value="activity"], button[value="activity"]'],
    highlightLabels: ['Listening activity'],
  },
  {
    title: "📋 Playlists Tab",
    message: "Here you can browse all user-created playlists and see what tracks they've added. Useful for content moderation and understanding user preferences.",
    cardPosition: 'bottom-right',
    tabToActivate: 'playlists',
    highlightSelectors: ['[data-state="active"][value="playlists"], button[value="playlists"]'],
    highlightLabels: ['User playlists'],
  },
  {
    title: "🎮 Games Tab",
    message: "Monitor active game sessions! See who's playing, their scores, gems collected, and what music they're listening to while gaming. The green badge shows active gamers.",
    cardPosition: 'bottom-right',
    tabToActivate: 'games',
    highlightSelectors: ['[data-state="active"][value="games"], button[value="games"]'],
    highlightLabels: ['Game sessions'],
  },
  {
    title: "🔑 API Keys Tab",
    message: "Manage your YouTube API keys here. You can add, enable/disable, and monitor key status. The failover system automatically switches to the next key when quota is exhausted.",
    cardPosition: 'bottom-right',
    tabToActivate: 'api-keys',
    highlightSelectors: ['[data-state="active"][value="api-keys"], button[value="api-keys"]'],
    highlightLabels: ['API key management'],
  },
  {
    title: "🔧 Maintenance Tab",
    message: "Toggle Maintenance Mode to lock out regular users during updates. You can add specific email addresses to a whitelist so they can still access the app during maintenance.",
    cardPosition: 'bottom-right',
    tabToActivate: 'maintenance',
    highlightSelectors: ['[data-state="active"][value="maintenance"], button[value="maintenance"]'],
    highlightLabels: ['Maintenance controls'],
  },
  {
    title: "🚀 You're Ready!",
    message: "That's everything! You now have full control over the platform. Remember — with great power comes great responsibility. Keep the vibes going! 🎶",
    cardPosition: 'center',
    tabToActivate: 'users',
  },
];

const HighlightArrow = ({ targetRect, label, index }: { targetRect: DOMRect; label: string; index: number }) => {
  const arrowLeft = targetRect.left + targetRect.width / 2;
  const clampedLeft = Math.min(Math.max(arrowLeft, 120), window.innerWidth - 120);
  const showAbove = targetRect.top > 160;

  return (
    <div
      className="fixed z-[103] flex flex-col items-center pointer-events-none animate-bounce"
      style={{
        top: showAbove ? targetRect.top - 65 : targetRect.bottom + 8,
        left: clampedLeft,
        transform: 'translateX(-50%)',
        animationDelay: `${index * 200}ms`,
        maxWidth: '80vw',
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

const createAudioContext = () => new (window.AudioContext || (window as any).webkitAudioContext)();

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

interface AdminTutorialProps {
  onComplete: () => void;
}

const AdminTutorial = ({ onComplete }: AdminTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [highlightRects, setHighlightRects] = useState<{ rect: DOMRect; label: string }[]>([]);
  const bgAudioRef = useRef<{ ctx: AudioContext } | null>(null);

  // Ambient background music
  useEffect(() => {
    try {
      const ctx = createAudioContext();
      const frequencies = [261.63, 329.63, 392.0, 523.25];
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 2);
      masterGain.connect(ctx.destination);

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        oscGain.gain.setValueAtTime(0.25, ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(ctx.currentTime + i * 0.3);
      });

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.15, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.02, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(masterGain.gain);
      lfo.start(ctx.currentTime);

      bgAudioRef.current = { ctx };
    } catch {}

    return () => {
      if (bgAudioRef.current) {
        try { bgAudioRef.current.ctx.close(); } catch {}
        bgAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 300);
  }, []);

  // Activate the correct tab for the current step
  useEffect(() => {
    const step = steps[currentStep];
    if (step.tabToActivate) {
      const tabButton = document.querySelector(`button[value="${step.tabToActivate}"]`) as HTMLElement;
      if (tabButton) {
        tabButton.click();
      }
    }
  }, [currentStep]);

  // Highlight elements
  useEffect(() => {
    document.querySelectorAll('[data-admin-tutorial-glow]').forEach(el => {
      (el as HTMLElement).style.removeProperty('box-shadow');
      (el as HTMLElement).style.removeProperty('z-index');
      (el as HTMLElement).style.removeProperty('position');
      (el as HTMLElement).removeAttribute('data-admin-tutorial-glow');
    });
    setHighlightRects([]);

    const step = steps[currentStep];
    if (!step.highlightSelectors?.length) return;

    const timer = setTimeout(() => {
      const rects: { rect: DOMRect; label: string }[] = [];
      step.highlightSelectors!.forEach((selector, i) => {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) {
          const rect = el.getBoundingClientRect();
          rects.push({ rect, label: step.highlightLabels?.[i] || '' });
          el.setAttribute('data-admin-tutorial-glow', 'true');
          el.style.position = 'relative';
          el.style.zIndex = '101';
          el.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.6), 0 0 25px hsl(var(--primary) / 0.3)';
        }
      });
      setHighlightRects(rects);
    }, 400);

    return () => {
      clearTimeout(timer);
      document.querySelectorAll('[data-admin-tutorial-glow]').forEach(el => {
        (el as HTMLElement).style.removeProperty('box-shadow');
        (el as HTMLElement).style.removeProperty('z-index');
        (el as HTMLElement).style.removeProperty('position');
        (el as HTMLElement).removeAttribute('data-admin-tutorial-glow');
      });
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
    playClickSound();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    playClickSound();
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleClose = useCallback(() => {
    playClickSound();
    setIsVisible(false);
    if (bgAudioRef.current) {
      try { bgAudioRef.current.ctx.close(); } catch {}
      bgAudioRef.current = null;
    }
    document.querySelectorAll('[data-admin-tutorial-glow]').forEach(el => {
      (el as HTMLElement).style.removeProperty('box-shadow');
      (el as HTMLElement).style.removeProperty('z-index');
      (el as HTMLElement).style.removeProperty('position');
      (el as HTMLElement).removeAttribute('data-admin-tutorial-glow');
    });
    // Switch back to users tab
    const usersTab = document.querySelector('button[value="users"]') as HTMLElement;
    if (usersTab) usersTab.click();
    setTimeout(onComplete, 400);
  }, [onComplete]);

  const step = steps[currentStep];

  const getCardPosition = () => {
    switch (step.cardPosition) {
      case 'bottom-right': return 'bottom-8 right-4 md:right-8';
      case 'bottom-left': return 'bottom-8 left-4 md:left-8';
      case 'top-center': return 'top-24 left-1/2 -translate-x-1/2';
      default: return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-400 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {highlightRects.map((hr, i) => (
        <HighlightArrow key={i} targetRect={hr.rect} label={hr.label} index={i} />
      ))}

      <div className={`fixed ${getCardPosition()} w-[90vw] max-w-md bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-5 md:p-6 transition-all duration-500 z-[102] ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <button onClick={handleClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img src={jarvisAvatar} alt="JARVIS" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/50" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
          </div>
          <div>
            <span className="text-sm font-bold text-primary">JARVIS</span>
            <p className="text-[10px] text-muted-foreground">Admin Guide</p>
          </div>
          <span className="text-[10px] text-muted-foreground ml-auto bg-secondary px-2 py-0.5 rounded-full">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        <h2 className="text-lg font-bold text-foreground mb-2">{step.title}</h2>

        <p className="text-muted-foreground text-sm leading-relaxed min-h-[3.5rem]">
          {typedText}
          {isTyping && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
        </p>

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

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentStep === 0} className="text-muted-foreground text-xs">
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground text-xs">
            Skip Tour
          </Button>
          <Button size="sm" onClick={handleNext} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
            {currentStep === steps.length - 1 ? "Let's Go! 🛡️" : 'Next'} <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminTutorial;
