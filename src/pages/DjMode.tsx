import { useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useDjAudio } from '@/hooks/useDjAudio';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Headphones, Power, RotateCcw, ChevronsLeft, ChevronsRight, Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DjMode = () => {
  const { currentTrack, isPlaying } = useMusicPlayer();
  const { state, apply, init, getLevels } = useDjAudio();
  const [activeTab, setActiveTab] = useState('dj');
  const [levels, setLevels] = useState({ left: 0, right: 0 });
  const rafRef = useRef<number>();

  useEffect(() => {
    const tick = () => {
      setLevels(getLevels());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [getLevels]);

  const enable = () => {
    const ok = init();
    if (!ok) {
      // Hint user
    }
  };

  const reset = () => apply({ balance: 0, leftGain: 1, rightGain: 1, low: 0, mid: 0, high: 0, active: state.active });

  const Deck = ({ side, gain, level }: { side: 'L' | 'R'; gain: number; level: number }) => (
    <div className="relative flex flex-col items-center gap-4 p-6 rounded-3xl glass-premium border border-white/10 overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{
        background: `radial-gradient(circle at center, hsl(var(--primary)) 0%, transparent 70%)`,
        transform: `scale(${0.6 + level * 0.8})`,
        transition: 'transform 60ms linear',
      }} />
      <div className="relative flex items-center gap-2 text-xs font-black uppercase tracking-[0.4em] text-muted-foreground">
        {side === 'L' ? <ChevronsLeft className="w-4 h-4" /> : null}
        Deck {side}
        {side === 'R' ? <ChevronsRight className="w-4 h-4" /> : null}
      </div>
      <div className="relative">
        <Disc3 className={cn("w-32 h-32 text-primary", isPlaying && state.active && "animate-spin-slow")} />
      </div>
      <div className="relative w-full">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 text-center">Channel Volume</div>
        <Slider
          min={0} max={150} step={1}
          value={[gain * 100]}
          onValueChange={(v) => apply({
            ...state,
            ...(side === 'L' ? { leftGain: v[0] / 100 } : { rightGain: v[0] / 100 }),
          })}
        />
        <div className="text-center text-xs font-bold text-primary mt-2">{Math.round(gain * 100)}%</div>
      </div>
      {/* VU meter */}
      <div className="relative w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-primary to-red-500 transition-all duration-75"
          style={{ width: `${level * 100}%` }} />
      </div>
    </div>
  );

  const EQKnob = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
      <div className="h-32 flex items-center">
        <Slider
          orientation="vertical"
          min={-12} max={12} step={0.5}
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          className="h-32"
        />
      </div>
      <div className="text-xs font-bold text-primary tabular-nums">{value > 0 ? '+' : ''}{value.toFixed(1)}dB</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-foreground">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="ml-0 md:ml-64 min-h-screen p-4 md:p-10 pt-20 md:pt-10 pb-44">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Headphones className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic neon-text">DJ Mode</h1>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.3em]">
              Split L/R • EQ • Channel Mix
            </p>
          </div>
          <Button
            onClick={state.active ? reset : enable}
            variant={state.active ? 'outline' : 'default'}
            className="gap-2"
          >
            {state.active ? <><RotateCcw className="w-4 h-4" /> Reset</> : <><Power className="w-4 h-4" /> Enable DJ</>}
          </Button>
        </div>

        {!state.active && (
          <div className="mb-6 p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 text-yellow-200 text-sm">
            ⚠️ DJ Mode only works on tracks playing through the <strong>background audio stream</strong> (not the YouTube iframe).
            Click <strong>Enable DJ</strong> while a song is playing. If controls have no effect, the current track is on YouTube — skip to the next track and try again.
          </div>
        )}

        {currentTrack && (
          <div className="mb-8 flex items-center gap-4 p-4 rounded-2xl glass-premium border border-white/10">
            <img src={currentTrack.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover" />
            <div className="min-w-0">
              <div className="font-bold truncate">{currentTrack.title}</div>
              <div className="text-xs text-muted-foreground truncate">{currentTrack.channel}</div>
            </div>
          </div>
        )}

        {/* Decks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Deck side="L" gain={state.leftGain} level={levels.left} />
          <Deck side="R" gain={state.rightGain} level={levels.right} />
        </div>

        {/* Crossfader */}
        <div className="p-6 rounded-3xl glass-premium border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Crossfader</span>
            <span className="text-xs font-bold text-primary">
              {state.balance === 0 ? 'CENTER' : state.balance < 0 ? `${Math.round(-state.balance * 100)}% LEFT` : `${Math.round(state.balance * 100)}% RIGHT`}
            </span>
          </div>
          <Slider
            min={-100} max={100} step={1}
            value={[state.balance * 100]}
            onValueChange={(v) => apply({ ...state, balance: v[0] / 100 })}
          />
          <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>L Only</span><span>Mix</span><span>R Only</span>
          </div>
        </div>

        {/* EQ */}
        <div className="p-6 rounded-3xl glass-premium border border-white/10">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">3-Band EQ</div>
          <div className="flex justify-around">
            <EQKnob label="Low" value={state.low} onChange={(v) => apply({ ...state, low: v })} />
            <EQKnob label="Mid" value={state.mid} onChange={(v) => apply({ ...state, mid: v })} />
            <EQKnob label="High" value={state.high} onChange={(v) => apply({ ...state, high: v })} />
          </div>
        </div>

        {/* Quick presets */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => apply({ ...state, balance: -1 })}>Left Ear Only</Button>
          <Button size="sm" variant="outline" onClick={() => apply({ ...state, balance: 1 })}>Right Ear Only</Button>
          <Button size="sm" variant="outline" onClick={() => apply({ ...state, balance: 0 })}>Center</Button>
          <Button size="sm" variant="outline" onClick={() => apply({ ...state, low: 6, mid: 0, high: -3 })}>Bass Boost</Button>
          <Button size="sm" variant="outline" onClick={() => apply({ ...state, low: -6, mid: 2, high: 6 })}>Vocal Pop</Button>
        </div>
      </div>
    </div>
  );
};

export default DjMode;
