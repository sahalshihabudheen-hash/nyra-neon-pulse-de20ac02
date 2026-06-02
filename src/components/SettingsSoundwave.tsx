import { cn } from '@/lib/utils';

interface SettingsSoundwaveProps {
  className?: string;
}

const SettingsSoundwave = ({ className }: SettingsSoundwaveProps) => {
  return (
    <div className={cn('flex items-end justify-center gap-1', className)}>
      {[...Array(7)].map((_, index) => (
        <div
          key={index}
          className="w-2 bg-primary rounded-full soundwave-bar"
          style={{
            height: `${20 + Math.random() * 30}px`,
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

export default SettingsSoundwave;
