import { useEffect, useRef } from 'react';

const SOUNDWAVE_FRAMES = [
  '▁▃▅▇▅▃',
  '▃▅▇▅▃▁',
  '▅▇▅▃▁▃',
  '▇▅▃▁▃▅',
  '▅▃▁▃▅▇',
  '▃▁▃▅▇▅',
];

export function useTabTitle(trackTitle: string | null, isPlaying: boolean) {
  const frameRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isPlaying && trackTitle) {
      const update = () => {
        const wave = SOUNDWAVE_FRAMES[frameRef.current % SOUNDWAVE_FRAMES.length];
        document.title = `${wave} ${trackTitle} - NYRA`;
        frameRef.current++;
      };
      update();
      intervalRef.current = setInterval(update, 500);
    } else if (trackTitle) {
      document.title = `⏸ ${trackTitle} - NYRA`;
    } else {
      document.title = 'NYRA - Feel the Pulse';
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trackTitle, isPlaying]);
}
