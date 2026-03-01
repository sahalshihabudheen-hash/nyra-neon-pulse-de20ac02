import { useState, useEffect } from 'react';

export type ThemeProfile = 'default' | 'villain' | 'hero' | 'chill-coder';

interface ProfileConfig {
  label: string;
  emoji: string;
  accent: string;
  bgClass: string;
}

export const themeProfiles: Record<ThemeProfile, ProfileConfig> = {
  default: { label: 'Default', emoji: '🎵', accent: '', bgClass: '' },
  villain: { label: 'Villain Mode', emoji: '🦹', accent: '0 100% 40%', bgClass: 'profile-villain' },
  hero: { label: 'Hero Mode', emoji: '🦸', accent: '210 100% 55%', bgClass: 'profile-hero' },
  'chill-coder': { label: 'Chill Coder', emoji: '💻', accent: '142 60% 45%', bgClass: 'profile-chill-coder' },
};

const STORAGE_KEY = 'nyra-theme-profile';

export function useThemeProfile() {
  const [profile, setProfileState] = useState<ThemeProfile>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ThemeProfile) || 'default';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, profile);
    
    // Remove all profile classes
    Object.values(themeProfiles).forEach(p => {
      if (p.bgClass) document.body.classList.remove(p.bgClass);
    });
    
    // Add current profile class
    const config = themeProfiles[profile];
    if (config.bgClass) {
      document.body.classList.add(config.bgClass);
    }

    // Set profile accent as CSS variable (ambient, doesn't replace primary)
    if (config.accent) {
      document.documentElement.style.setProperty('--profile-accent', config.accent);
    } else {
      document.documentElement.style.removeProperty('--profile-accent');
    }
  }, [profile]);

  const setProfile = (p: ThemeProfile) => setProfileState(p);

  return { profile, setProfile, config: themeProfiles[profile] };
}
