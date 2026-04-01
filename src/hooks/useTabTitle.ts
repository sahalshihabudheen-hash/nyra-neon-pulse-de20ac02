import { useEffect, useRef } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { settings } = useAppSettings();

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const appName = settings.app_name || 'NYRA';
    const tagline = settings.app_tagline || 'Feel the Pulse';

    if (isPlaying && trackTitle) {
      const update = () => {
        const wave = SOUNDWAVE_FRAMES[frameRef.current % SOUNDWAVE_FRAMES.length];
        document.title = `${wave} ${trackTitle} - ${appName}`;
        frameRef.current++;
      };
      update();
      intervalRef.current = setInterval(update, 500);
    } else if (trackTitle) {
      document.title = `⏸ ${trackTitle} - ${appName}`;
    } else {
      document.title = `${appName} - ${tagline}`;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [trackTitle, isPlaying, settings.app_name, settings.app_tagline]);
}
