import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Search, Play, ListMusic, User, Image, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  message: string;
}

const steps: TutorialStep[] = [
  {
    icon: <Music className="w-8 h-8" />,
    title: "Welcome to NYRA",
    message: "Hey there! I'm JARVIS, your personal guide. Let me show you around NYRA so you can get the most out of your experience. This will only take a moment!",
  },
  {
    icon: <Search className="w-8 h-8" />,
    title: "Search for Music",
    message: "Use the search bar at the top to find any song you love. Just type a song name, artist, or keyword and hit enter. We'll find it for you instantly!",
  },
  {
    icon: <Play className="w-8 h-8" />,
    title: "Play Music",
    message: "Click on any track card to start playing. Use the player at the bottom to control playback — pause, skip, go back, and adjust volume. You can also add songs to your queue!",
  },
  {
    icon: <ListMusic className="w-8 h-8" />,
    title: "Create Playlists",
    message: "Head to the Playlists section from the sidebar to create your own playlists. You can add songs, reorder them, and even shuffle through your collection!",
  },
  {
    icon: <User className="w-8 h-8" />,
    title: "Set Your Username",
    message: "Go to Settings to set your display name. This is how other users and the admin will see you. Make it unique!",
  },
  {
    icon: <Image className="w-8 h-8" />,
    title: "Upload Your Avatar",
    message: "In Settings, you can also upload a profile picture. We support PNG and GIF formats — so yes, animated avatars are totally fine! Max size is 5MB.",
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

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 300);
  }, []);

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
    }, 20);
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
    setTimeout(onComplete, 400);
  };

  const step = steps[currentStep];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-400 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* JARVIS Card */}
      <div className={`relative w-[90vw] max-w-lg bg-card border border-primary/30 rounded-2xl shadow-2xl shadow-primary/20 p-6 md:p-8 transition-all duration-500 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
        {/* Close */}
        <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* JARVIS Badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-primary">JARVIS</span>
          <span className="text-xs text-muted-foreground ml-auto">{currentStep + 1} / {steps.length}</span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 mx-auto">
          {step.icon}
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground text-center mb-3">{step.title}</h2>

        {/* Typed Message */}
        <p className="text-muted-foreground text-center text-sm leading-relaxed min-h-[4rem]">
          {typedText}
          {isTyping && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 my-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-primary' : i < currentStep ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted'}`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
            Skip
          </Button>

          <Button size="sm" onClick={handleNext} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {currentStep === steps.length - 1 ? "Let's Go!" : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JarvisTutorial;
