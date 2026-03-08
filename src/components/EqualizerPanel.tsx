import { useState, useEffect, useCallback, useRef } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EqualizerBand {
  frequency: number;
  label: string;
  gain: number;
}

interface Preset {
  name: string;
  icon: string;
  bands: number[]; // gains for each band
}

const PRESETS: Preset[] = [
  { name: 'Flat', icon: '⊝', bands: [0, 0, 0, 0, 0] },
  { name: 'Bass Boost', icon: '🔊', bands: [6, 4, 0, -1, -1] },
  { name: 'Treble', icon: '🔔', bands: [-1, 0, 1, 4, 6] },
  { name: 'Pop', icon: '🎤', bands: [-1, 2, 4, 2, -1] },
  { name: 'Rock', icon: '🎸', bands: [4, 2, -1, 2, 4] },
  { name: 'Jazz', icon: '🎷', bands: [3, 1, -2, 1, 3] },
];

const DEFAULT_BANDS: EqualizerBand[] = [
  { frequency: 60, label: '60', gain: 0 },
  { frequency: 250, label: '250', gain: 0 },
  { frequency: 1000, label: '1K', gain: 0 },
  { frequency: 4000, label: '4K', gain: 0 },
  { frequency: 12000, label: '12K', gain: 0 },
];

interface EqualizerPanelProps {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

const EqualizerPanel = ({ audioRef, isOpen, onClose }: EqualizerPanelProps) => {
  const [bands, setBands] = useState<EqualizerBand[]>(DEFAULT_BANDS);
  const [activePreset, setActivePreset] = useState('Flat');
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Web Audio API filters
  const initAudioContext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Don't reconnect if same audio element
    if (connectedAudioRef.current === audio && audioContextRef.current) {
      return;
    }

    try {
      // Clean up previous
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch {}
      }

      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaElementSource(audio);
      sourceRef.current = source;
      connectedAudioRef.current = audio;

      // Create 5-band EQ
      const filters = DEFAULT_BANDS.map((band, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === DEFAULT_BANDS.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = band.frequency;
        filter.gain.value = band.gain;
        if (filter.type === 'peaking') filter.Q.value = 1.4;
        return filter;
      });

      // Chain: source -> filter0 -> filter1 -> ... -> destination
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(ctx.destination);

      filtersRef.current = filters;
    } catch (err) {
      console.error('Failed to init equalizer:', err);
    }
  }, [audioRef]);

  // Connect when panel opens and audio is available
  useEffect(() => {
    if (isOpen && audioRef.current?.src) {
      initAudioContext();
    }
  }, [isOpen, initAudioContext, audioRef]);

  // Update filter gains when bands change
  useEffect(() => {
    filtersRef.current.forEach((filter, i) => {
      if (bands[i]) {
        filter.gain.value = bands[i].gain;
      }
    });
  }, [bands]);

  const handleBandChange = (index: number, gain: number) => {
    setActivePreset('Custom');
    setBands(prev => prev.map((b, i) => i === index ? { ...b, gain } : b));
  };

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.name);
    setBands(prev => prev.map((b, i) => ({ ...b, gain: preset.bands[i] })));
  };

  if (!isOpen) return null;

  return (
    <div className="bg-card/95 backdrop-blur-xl border border-primary/20 rounded-2xl p-4 md:p-5 shadow-2xl shadow-primary/10 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Equalizer</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Presets */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => applyPreset(preset)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
              activePreset === preset.name
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {preset.icon} {preset.name}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="flex items-end justify-between gap-3 md:gap-5">
        {bands.map((band, i) => (
          <div key={band.frequency} className="flex flex-col items-center gap-2">
            {/* Gain label */}
            <span className="text-[10px] text-muted-foreground font-mono">
              {band.gain > 0 ? '+' : ''}{band.gain.toFixed(0)}
            </span>

            {/* Vertical slider */}
            <div className="relative w-6 h-28 md:h-36 flex items-center justify-center">
              <div className="absolute w-1 h-full rounded-full bg-muted" />
              <div
                className="absolute w-1 rounded-full bg-primary transition-all"
                style={{
                  height: `${Math.abs(band.gain) / 12 * 50}%`,
                  bottom: band.gain >= 0 ? '50%' : undefined,
                  top: band.gain < 0 ? '50%' : undefined,
                }}
              />
              {/* Center line */}
              <div className="absolute w-3 h-px bg-muted-foreground/30" />
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={band.gain}
                onChange={(e) => handleBandChange(i, parseFloat(e.target.value))}
                className="absolute w-28 md:w-36 opacity-0 cursor-pointer"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                }}
              />
              {/* Thumb indicator */}
              <div
                className="absolute w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-lg pointer-events-none transition-all"
                style={{
                  bottom: `${((band.gain + 12) / 24) * 100}%`,
                  transform: 'translateY(50%)',
                }}
              />
            </div>

            {/* Frequency label */}
            <span className="text-[10px] text-muted-foreground font-medium">{band.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EqualizerPanel;
