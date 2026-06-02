import { SlidersHorizontal, X } from 'lucide-react';
import jarvisAvatar from '@/assets/jarvis-avatar.gif';

interface EqualizerPanelProps {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

const EqualizerPanel = ({ isOpen, onClose }: EqualizerPanelProps) => {
  if (!isOpen) return null;

  return (
    <div className="bg-card/95 backdrop-blur-xl border border-primary/20 rounded-2xl p-4 md:p-5 shadow-2xl shadow-primary/10 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
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

      {/* Jarvis Coming Soon Message */}
      <div className="flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-3 border border-primary/10">
        <img
          src={jarvisAvatar}
          alt="Jarvis"
          className="w-10 h-10 rounded-full border-2 border-primary/30 flex-shrink-0"
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary font-semibold">JARVIS:</span>{' '}
          I'm adding full equalizer support soon — stay tuned for real-time audio effects! 🎧
        </p>
      </div>
    </div>
  );
};

export default EqualizerPanel;
