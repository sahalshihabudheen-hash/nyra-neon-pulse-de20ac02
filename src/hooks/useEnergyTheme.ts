import { useEffect, useRef } from 'react';

interface MoodTheme {
  primary: string;
  className: string;
  label: string;
}

const moodKeywords: Record<string, string[]> = {
  phonk: ['phonk', 'drift', 'cowbell', 'aggressive'],
  lofi: ['lofi', 'lo-fi', 'lo fi', 'chill beats', 'study', 'relax'],
  edm: ['edm', 'electronic', 'dubstep', 'house', 'trance', 'rave', 'bass drop', 'festival'],
  sad: ['sad', 'heartbreak', 'crying', 'lonely', 'broken', 'pain', 'depressed', 'melancholy'],
};

const moodThemes: Record<string, MoodTheme> = {
  phonk: { primary: '0 100% 50%', className: 'mood-phonk', label: '🔥 Phonk Mode' },
  lofi: { primary: '210 60% 55%', className: 'mood-lofi', label: '🌊 Lofi Chill' },
  edm: { primary: '280 100% 60%', className: 'mood-edm', label: '⚡ EDM Energy' },
  sad: { primary: '220 10% 50%', className: 'mood-sad', label: '🌧️ Sad Vibes' },
};

export function detectMood(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some(k => lower.includes(k))) return mood;
  }
  return null;
}

export function getMoodTheme(mood: string | null): MoodTheme | null {
  return mood ? moodThemes[mood] || null : null;
}

export function useEnergyTheme(trackTitle: string | undefined, enabled: boolean) {
  const prevMoodRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !trackTitle) {
      // Remove mood class
      document.body.classList.remove('mood-phonk', 'mood-lofi', 'mood-edm', 'mood-sad');
      prevMoodRef.current = null;
      return;
    }

    const mood = detectMood(trackTitle);
    
    // Remove old mood class
    if (prevMoodRef.current) {
      document.body.classList.remove(`mood-${prevMoodRef.current}`);
    }

    if (mood) {
      const theme = moodThemes[mood];
      document.body.classList.add(theme.className);
      // Set mood-specific CSS variables (won't override user theme, just adds ambient effect)
      document.documentElement.style.setProperty('--mood-color', theme.primary);
    } else {
      document.documentElement.style.removeProperty('--mood-color');
    }

    prevMoodRef.current = mood;

    return () => {
      if (mood) document.body.classList.remove(`mood-${mood}`);
      document.documentElement.style.removeProperty('--mood-color');
    };
  }, [trackTitle, enabled]);

  return detectMood(trackTitle || '');
}
