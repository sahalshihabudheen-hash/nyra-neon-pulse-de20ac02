import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SoundwaveVisualizer from './SoundwaveVisualizer';

const EmbedPlayer = () => {
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title') || 'Unknown Title';
  const channel = searchParams.get('channel') || 'Unknown Artist';
  const thumbnail = searchParams.get('thumbnail') || '';
  const [progress, setProgress] = useState(0);

  // Simulate progress bar movement
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0b0b0b] flex items-center justify-center p-4 font-sans text-white overflow-hidden">
      {/* Spotify-style Card Container */}
      <div className="w-full max-w-[500px] bg-[#121212] rounded-xl p-6 flex items-center gap-6 border border-white/5 shadow-2xl relative overflow-hidden group">
        
        {/* Animated Background Glow */}
        <div className="absolute -inset-2 bg-primary/20 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />

        {/* Thumbnail with Glowing Progress Ring */}
        <div className="relative flex-shrink-0 w-24 h-24 md:w-32 md:h-32">
          {/* Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="#282828"
              strokeWidth="4"
            />
            <circle
              cx="50%"
              cy="50%"
              r="48%"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeDasharray="100"
              strokeDashoffset={100 - progress}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,211,0,0.5)]"
              style={{ strokeDasharray: '301.59', strokeDashoffset: (301.59 * (100 - progress)) / 100 }}
            />
          </svg>
          
          <img 
            src={thumbnail} 
            alt={title} 
            className="absolute inset-[6px] w-[calc(100%-12px)] h-[calc(100%-12px)] object-cover rounded-full shadow-lg"
          />
        </div>

        {/* Info & Soundwaves */}
        <div className="flex flex-col flex-grow min-w-0 z-10">
          <div className="mb-2">
            <h1 className="text-xl md:text-2xl font-bold truncate mb-1 text-white">{title}</h1>
            <p className="text-sm md:text-base text-gray-400 truncate font-medium uppercase tracking-wider">{channel}</p>
          </div>

          {/* Soundwaves */}
          <div className="mt-2 h-12 flex items-end">
            <SoundwaveVisualizer isPlaying={true} shape="bars" className="!h-full w-full justify-start scale-x-110" />
          </div>

          {/* Faux Controls */}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 font-mono">
            <span>{Math.floor((progress * 210) / 100 / 60)}:{String(Math.floor((progress * 210) / 100 % 60)).padStart(2, '0')}</span>
            <div className="flex-grow mx-4 h-[2px] bg-[#282828] relative">
              <div 
                className="absolute inset-0 bg-primary" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>3:30</span>
          </div>
        </div>

        {/* Branding Logo */}
        <div className="absolute top-4 right-6 text-[10px] font-bold text-primary tracking-[0.2em] opacity-30">
          NYRA PREMIUM
        </div>
      </div>
    </div>
  );
};

export default EmbedPlayer;
