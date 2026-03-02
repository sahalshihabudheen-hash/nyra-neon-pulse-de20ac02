import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { SoundwaveShape } from '@/components/SoundwaveVisualizer';

export type ThemeName = 'yellow' | 'blue' | 'green' | 'purple' | 'red' | 'custom';

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
  custom: {
    name: 'custom',
    primary: '50 100% 50%',
    background: '0 0% 4%',
    backgroundImage: '',
  },
};

export interface GradientConfig {
  enabled: boolean;
  startColor: string;
  endColor: string;
  angle: number;
}

interface AppSettings {
  soundwaveEnabled: boolean;
  autoPlayNext: boolean;
  miniPlayerMode: boolean;
  soundwaveShape: SoundwaveShape;
  dropDetectorEnabled: boolean;
  energyThemeEnabled: boolean;
  powerLevelsEnabled: boolean;
  energyMeterEnabled: boolean;
  themeProfileEnabled: boolean;
  musicMemoryEnabled: boolean;
}

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  customColor: string;
  setCustomColor: (color: string) => void;
  gradient: GradientConfig;
  setGradient: (gradient: Partial<GradientConfig>) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// Helper to convert hex to HSL
const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '50 100% 50%';
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('nyra-theme');
    return (saved as ThemeName) || 'yellow';
  });

  const [customColor, setCustomColorState] = useState<string>(() => {
    return localStorage.getItem('nyra-custom-color') || '#ffd300';
  });

  const [gradient, setGradientState] = useState<GradientConfig>(() => {
    const saved = localStorage.getItem('nyra-gradient');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      startColor: '#ffd300',
      endColor: '#ff6b00',
      angle: 135,
    };
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('nyra-settings');
    return saved ? JSON.parse(saved) : {
      soundwaveEnabled: true,
      autoPlayNext: true,
      miniPlayerMode: false,
      soundwaveShape: 'bars' as SoundwaveShape,
      dropDetectorEnabled: true,
      energyThemeEnabled: true,
      powerLevelsEnabled: true,
      energyMeterEnabled: true,
      themeProfileEnabled: true,
      musicMemoryEnabled: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('nyra-theme', currentTheme);
    localStorage.setItem('nyra-custom-color', customColor);
    localStorage.setItem('nyra-gradient', JSON.stringify(gradient));
    
    let primaryHsl: string;
    
    // If gradient is enabled, use the start color as primary
    if (gradient.enabled) {
      primaryHsl = hexToHsl(gradient.startColor);
    } else if (currentTheme === 'custom') {
      primaryHsl = hexToHsl(customColor);
    } else {
      primaryHsl = themes[currentTheme].primary;
    }
    
    // Apply CSS variables
    document.documentElement.style.setProperty('--primary', primaryHsl);
    document.documentElement.style.setProperty('--accent', primaryHsl);
    document.documentElement.style.setProperty('--ring', primaryHsl);
    document.documentElement.style.setProperty('--sidebar-primary', primaryHsl);
    document.documentElement.style.setProperty('--sidebar-ring', primaryHsl);
    document.documentElement.style.setProperty('--neon', primaryHsl);
    
    // Update neon glow
    const hsl = `hsl(${primaryHsl})`;
    document.documentElement.style.setProperty(
      '--neon-glow',
      `0 0 20px ${hsl.replace(')', ' / 0.5)')}, 0 0 40px ${hsl.replace(')', ' / 0.3)')}`
    );
    document.documentElement.style.setProperty(
      '--neon-glow-strong',
      `0 0 30px ${hsl.replace(')', ' / 0.6)')}, 0 0 60px ${hsl.replace(')', ' / 0.4)')}, 0 0 100px ${hsl.replace(')', ' / 0.2)')}`
    );

    // Apply gradient if enabled
    if (gradient.enabled) {
      document.documentElement.style.setProperty(
        '--theme-gradient',
        `linear-gradient(${gradient.angle}deg, ${gradient.startColor}, ${gradient.endColor})`
      );
    } else {
      document.documentElement.style.removeProperty('--theme-gradient');
    }

    // Apply background image if exists
    const theme = themes[currentTheme];
    if (theme.backgroundImage) {
      document.body.style.backgroundImage = `url(${theme.backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = '';
    }
  }, [currentTheme, customColor, gradient]);

  useEffect(() => {
    localStorage.setItem('nyra-settings', JSON.stringify(settings));
  }, [settings]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
  };

  const setCustomColor = (color: string) => {
    setCustomColorState(color);
    setCurrentTheme('custom');
  };

  const setGradient = (newGradient: Partial<GradientConfig>) => {
    setGradientState(prev => ({ ...prev, ...newGradient }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme, 
      settings, 
      updateSettings,
      customColor,
      setCustomColor,
      gradient,
      setGradient,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};