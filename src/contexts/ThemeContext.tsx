import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { SoundwaveShape } from '@/components/SoundwaveVisualizer';

export type ThemeName = 'yellow' | 'blue' | 'green' | 'purple' | 'red';

interface ThemeConfig {
  name: ThemeName;
  primary: string;
  background: string;
  backgroundImage: string;
}

export const themes: Record<ThemeName, ThemeConfig> = {
  yellow: {
    name: 'yellow',
    primary: '50 100% 50%',
    background: '0 0% 4%',
    backgroundImage: '',
  },
  blue: {
    name: 'blue',
    primary: '210 100% 50%',
    background: '210 30% 8%',
    backgroundImage: 'https://i.postimg.cc/Twk9wNQW/BLUE.jpg',
  },
  green: {
    name: 'green',
    primary: '142 76% 45%',
    background: '142 30% 6%',
    backgroundImage: 'https://i.postimg.cc/44SPRMmr/GREEN.jpg',
  },
  purple: {
    name: 'purple',
    primary: '280 100% 60%',
    background: '280 30% 8%',
    backgroundImage: 'https://i.postimg.cc/25GdcXp6/PURPLE.jpg',
  },
  red: {
    name: 'red',
    primary: '0 100% 50%',
    background: '0 30% 8%',
    backgroundImage: 'https://i.postimg.cc/13Zp9Zsf/RED.jpg',
  },
};

interface AppSettings {
  soundwaveEnabled: boolean;
  autoPlayNext: boolean;
  miniPlayerMode: boolean;
  soundwaveShape: SoundwaveShape;
}

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('nyra-theme');
    return (saved as ThemeName) || 'yellow';
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('nyra-settings');
    return saved ? JSON.parse(saved) : {
      soundwaveEnabled: true,
      autoPlayNext: true,
      miniPlayerMode: false,
      soundwaveShape: 'bars' as SoundwaveShape,
    };
  });

  useEffect(() => {
    localStorage.setItem('nyra-theme', currentTheme);
    const theme = themes[currentTheme];
    
    // Apply CSS variables
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--accent', theme.primary);
    document.documentElement.style.setProperty('--ring', theme.primary);
    document.documentElement.style.setProperty('--sidebar-primary', theme.primary);
    document.documentElement.style.setProperty('--sidebar-ring', theme.primary);
    document.documentElement.style.setProperty('--neon', theme.primary);
    
    // Update neon glow
    const hsl = `hsl(${theme.primary})`;
    document.documentElement.style.setProperty(
      '--neon-glow',
      `0 0 20px ${hsl.replace(')', ' / 0.5)')}, 0 0 40px ${hsl.replace(')', ' / 0.3)')}`
    );
    document.documentElement.style.setProperty(
      '--neon-glow-strong',
      `0 0 30px ${hsl.replace(')', ' / 0.6)')}, 0 0 60px ${hsl.replace(')', ' / 0.4)')}, 0 0 100px ${hsl.replace(')', ' / 0.2)')}`
    );

    // Apply background image if exists
    if (theme.backgroundImage) {
      document.body.style.backgroundImage = `url(${theme.backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('nyra-settings', JSON.stringify(settings));
  }, [settings]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, settings, updateSettings }}>
      {children}
    </ThemeContext.Provider>
  );
};