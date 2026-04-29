import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, Music2, ShieldCheck, Zap, Headphones, Play } from 'lucide-react';
import nyraLogo from '@/assets/nyra-logo.png';
import SoundwaveVisualizer from '@/components/SoundwaveVisualizer';
import { useAppSettings } from '@/hooks/useAppSettings';
import { cn } from '@/lib/utils';

const Auth = () => {
  const { settings: appSettings } = useAppSettings();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnter = () => {
    toast.success('Syncing with your device...', {
      icon: <Zap className="w-4 h-4 text-primary" />,
      className: "glass-premium border-primary/20",
    });
    setTimeout(() => navigate('/'), 1200);
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden bg-[#050505]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[150px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-20" />
      </div>

      <div className={cn(
        "relative z-30 w-full max-w-lg transition-all duration-1000 transform",
        mounted ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      )}>
        <Card className="glass-premium border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-3xl rounded-[2rem]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="p-10 md:p-14">
            {/* Logo Section */}
            <div className="flex flex-col items-center mb-12 text-center">
              <div className="relative mb-8 group cursor-pointer" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
                <div className={cn(
                  "absolute -inset-6 bg-primary/20 rounded-full blur-2xl transition-all duration-700",
                  isHovering ? "scale-125 opacity-100" : "scale-100 opacity-60"
                )} />
                <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-primary/40 p-[1px] shadow-2xl float">
                  <div className="w-full h-full bg-[#080808] rounded-[31px] flex items-center justify-center overflow-hidden">
                    <img 
                      src={appSettings.app_logo_url || nyraLogo} 
                      alt={appSettings.app_name} 
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-xl shadow-xl animate-bounce">
                  <Headphones className="w-5 h-5" />
                </div>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-3">
                <span className="neon-text uppercase italic">{appSettings.app_name}</span>
              </h1>
              <p className="text-muted-foreground/80 font-medium tracking-widest text-xs uppercase flex items-center gap-3">
                <div className="h-px w-8 bg-primary/30" />
                {appSettings.app_tagline || "Feel the Pulse"}
                <div className="h-px w-8 bg-primary/30" />
              </p>
            </div>

            {/* Visualizer Section */}
            <div className="mb-12 py-6 px-4 bg-white/5 rounded-3xl border border-white/5 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <SoundwaveVisualizer 
                isPlaying={true} 
                className="w-full h-16 scale-125" 
                shape="waves"
              />
              <p className="text-[10px] text-center mt-4 font-mono text-primary/40 tracking-[0.2em] uppercase">
                Audio Engine Ready
              </p>
            </div>

            {/* Main Action */}
            <div className="space-y-6">
              <Button
                onClick={handleEnter}
                className="w-full h-16 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-black text-lg transition-all duration-500 shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_50px_rgba(255,215,0,0.5)] flex items-center justify-center gap-3 group active:scale-95"
              >
                <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                <span className="tracking-tight">ENTER NYRA</span>
              </Button>

              <div className="flex items-center justify-center gap-6">
                 <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3 text-primary/40" />
                  No Login Required
                </div>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                  <Zap className="w-3 h-3 text-primary/40" />
                  Instant Access
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer info */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 opacity-30 hover:opacity-100 transition-opacity duration-500 cursor-default">
             <div className="h-px w-12 bg-white/20" />
             <div className="flex gap-4">
                <Sparkles className="w-4 h-4" />
                <Music2 className="w-4 h-4" />
                <Headphones className="w-4 h-4" />
             </div>
             <div className="h-px w-12 bg-white/20" />
          </div>
          <p className="text-center text-[10px] text-muted-foreground/30 font-bold tracking-[0.3em] uppercase">
            Designed for the next generation of sound
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;


