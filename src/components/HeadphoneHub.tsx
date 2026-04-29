import { X, Headphones, Zap, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Button } from '@/components/ui/button';

interface HeadphoneHubProps {
  isOpen: boolean;
  onClose: () => void;
}

const HeadphoneHub = ({ isOpen, onClose }: HeadphoneHubProps) => {
  const { djMode, toggleDJMode, isHeadphoneConnected } = useMusicPlayer();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in-fade">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-4xl glass-premium border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(var(--primary),0.2)] flex flex-col md:flex-row">
        
        {/* Left Side: Interactive Visual */}
        <div className="relative flex-1 bg-black/40 flex items-center justify-center p-8 min-h-[300px] md:min-h-[500px] group">
           <img 
            src="/premium_studio_headphones_1777460808170.png" 
            alt="Premium Headphones" 
            className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-transform duration-700 group-hover:scale-105"
           />
           
           {/* Interactive Areas Overlay */}
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64">
                {/* Left Earcup Hotspot */}
                <button 
                  onClick={() => toggleDJMode('left')}
                  className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-20 h-32 rounded-full border-2 transition-all duration-500",
                    djMode === 'left' ? "border-primary bg-primary/20 scale-110 shadow-[0_0_30px_rgba(var(--primary),0.5)]" : "border-white/5 hover:border-white/20"
                  )}
                  title="Lock to Left Ear"
                />
                
                {/* Right Earcup Hotspot */}
                <button 
                  onClick={() => toggleDJMode('right')}
                  className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 w-20 h-32 rounded-full border-2 transition-all duration-500",
                    djMode === 'right' ? "border-primary bg-primary/20 scale-110 shadow-[0_0_30_rgba(var(--primary),0.5)]" : "border-white/5 hover:border-white/20"
                  )}
                  title="Lock to Right Ear"
                />
                
                {/* Center / Headband Hotspot */}
                <button 
                  onClick={() => toggleDJMode('auto')}
                  className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full border-2 transition-all duration-500",
                    djMode === 'auto' ? "border-primary bg-primary/20 scale-110 shadow-[0_0_30px_rgba(var(--primary),0.5)]" : "border-white/5 hover:border-white/20"
                  )}
                  title="8D Auto Panning"
                />
              </div>
           </div>

           {/* Label Overlay */}
           <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md">
                 <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Interactive Audio Matrix</span>
              </div>
           </div>
        </div>

        {/* Right Side: Controls */}
        <div className="w-full md:w-[350px] p-8 md:p-12 flex flex-col border-t md:border-t-0 md:border-l border-white/5 bg-white/[0.02]">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Headphone Hub</h2>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Extreme DJ Engine v2</p>
                 </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors">
                 <X className="w-5 h-5 text-muted-foreground" />
              </button>
           </div>

           <div className="space-y-6 flex-1">
              {/* Status Card */}
              <div className={cn(
                "p-4 rounded-3xl border transition-all duration-500",
                isHeadphoneConnected ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20"
              )}>
                 <div className="flex items-start gap-3">
                    {isHeadphoneConnected ? (
                      <ShieldCheck className="w-5 h-5 text-green-500 mt-1" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-500 mt-1" />
                    )}
                    <div>
                       <p className="text-sm font-bold text-foreground">
                          {isHeadphoneConnected ? "Hardware Detected" : "Headset Optimized"}
                       </p>
                       <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                          {isHeadphoneConnected 
                            ? "Your headphones are active and synced with the spatial engine." 
                            : "For the best 8D experience, please connect a high-quality headset."}
                       </p>
                    </div>
                 </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-4">Select Experience</p>
                 
                 {[
                   { id: 'auto', label: '8D AUTO PULSE', desc: 'Bouncing ear-to-ear spatial audio' },
                   { id: 'left', label: 'HARD LEFT LOCK', desc: 'Locked 100% to the left channel' },
                   { id: 'right', label: 'HARD RIGHT LOCK', desc: 'Locked 100% to the right channel' },
                   { id: 'off', label: 'PURE STEREO', desc: 'Standard high-fidelity bypass' },
                 ].map((mode) => (
                   <button
                    key={mode.id}
                    onClick={() => toggleDJMode(mode.id as any)}
                    className={cn(
                      "w-full p-4 rounded-2xl border text-left transition-all group relative overflow-hidden",
                      djMode === mode.id 
                        ? "bg-primary border-transparent text-primary-foreground shadow-lg" 
                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:border-white/10"
                    )}
                   >
                     <div className="relative z-10">
                        <p className="text-xs font-black tracking-widest">{mode.label}</p>
                        <p className={cn(
                          "text-[9px] mt-1 font-medium",
                          djMode === mode.id ? "text-primary-foreground/60" : "text-muted-foreground/40"
                        )}>{mode.desc}</p>
                     </div>
                     {djMode === mode.id && (
                        <div className="absolute top-1/2 right-4 -translate-y-1/2">
                           <Zap className="w-4 h-4 animate-pulse" />
                        </div>
                     )}
                   </button>
                 ))}
              </div>
           </div>

           <div className="mt-8 pt-8 border-t border-white/5">
              <div className="flex items-center gap-2 text-primary/40">
                 <Zap className="w-3 h-3" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em]">Extreme Bass Engine Active</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HeadphoneHub;
