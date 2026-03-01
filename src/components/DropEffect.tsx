import { cn } from '@/lib/utils';

interface DropEffectProps {
  active: boolean;
}

const DropEffect = ({ active }: DropEffectProps) => {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Flash */}
      <div className="absolute inset-0 bg-primary/20 animate-drop-flash" />
      {/* Radial pulse */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[200vw] h-[200vw] rounded-full border-4 border-primary/40 animate-drop-ring" />
      </div>
      {/* Bass pulse lines */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-primary/60 animate-drop-bass" />
      <div className="absolute top-0 left-0 right-0 h-2 bg-primary/60 animate-drop-bass" />
    </div>
  );
};

export default DropEffect;
