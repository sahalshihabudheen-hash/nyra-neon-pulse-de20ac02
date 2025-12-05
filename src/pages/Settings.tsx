import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette, Volume2, ListMusic, Trash2, Waves } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, themes, ThemeName } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import SettingsSoundwave from '@/components/SettingsSoundwave';
import SoundwaveVisualizer, { SoundwaveShape } from '@/components/SoundwaveVisualizer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const themePreview: Record<ThemeName, { label: string; color: string }> = {
  yellow: { label: 'Neon Yellow', color: 'hsl(50 100% 50%)' },
  blue: { label: 'Ocean Blue', color: 'hsl(210 100% 50%)' },
  green: { label: 'Forest Green', color: 'hsl(142 76% 45%)' },
  purple: { label: 'Royal Purple', color: 'hsl(280 100% 60%)' },
  red: { label: 'Fire Red', color: 'hsl(0 100% 50%)' },
};

const soundwaveShapes: { value: SoundwaveShape; label: string; icon: string }[] = [
  { value: 'bars', label: 'Classic Bars', icon: '▎▌█▌▎' },
  { value: 'waves', label: 'Smooth Waves', icon: '∿∿∿' },
  { value: 'dots', label: 'Bouncing Dots', icon: '● ● ●' },
  { value: 'pulse', label: 'Pulse Ring', icon: '◎' },
  { value: 'spectrum', label: 'Spectrum', icon: '◂▸' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentTheme, setTheme, settings, updateSettings } = useTheme();
  const [activeTab, setActiveTab] = useState('settings');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPlaying, setPreviewPlaying] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleClearPlaylist = () => {
    localStorage.removeItem('nyra-playlist');
    localStorage.removeItem('nyra-queue');
    toast.success('Playlist and queue cleared');
  };

  return (
    <div className="min-h-screen bg-background/80">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="ml-0 md:ml-64">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={() => navigate('/')}
        />

        <main className="pt-28 pb-32 px-4 md:px-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors active:scale-95 touch-manipulation"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <div className="flex items-center gap-4 mb-8 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold neon-text">Settings</h1>
            <SettingsSoundwave className="h-8" />
          </div>

          {/* Theme Selection */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <Palette className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Theme</h2>
              <SettingsSoundwave className="h-6 ml-4" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
              {(Object.keys(themes) as ThemeName[]).map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  className={cn(
                    'relative p-3 md:p-4 rounded-xl border-2 transition-all overflow-hidden active:scale-95 touch-manipulation',
                    currentTheme === themeName
                      ? 'border-primary neon-glow scale-105'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {themes[themeName].backgroundImage && (
                    <img
                      src={themes[themeName].backgroundImage}
                      alt={themePreview[themeName].label}
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative z-10">
                    <div
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full mx-auto mb-2 md:mb-3 shadow-lg"
                      style={{ backgroundColor: themePreview[themeName].color }}
                    />
                    <p className="text-xs md:text-sm font-medium text-foreground text-center">
                      {themePreview[themeName].label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Soundwave Shape Selection */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Waves className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Soundwave Style</h2>
            </div>

            <div className="bg-card rounded-xl p-4 md:p-6 border border-border">
              {/* Preview */}
              <div className="flex items-center justify-center mb-6 p-4 bg-background/50 rounded-lg">
                <div className="flex flex-col items-center gap-4">
                  <SoundwaveVisualizer 
                    isPlaying={previewPlaying} 
                    className="h-12 w-40"
                    shape={settings.soundwaveShape}
                  />
                  <button
                    onClick={() => setPreviewPlaying(!previewPlaying)}
                    className="text-sm text-primary hover:underline touch-manipulation"
                  >
                    {previewPlaying ? 'Pause Preview' : 'Play Preview'}
                  </button>
                </div>
              </div>

              {/* Shape Options */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {soundwaveShapes.map((shape) => (
                  <button
                    key={shape.value}
                    onClick={() => updateSettings({ soundwaveShape: shape.value })}
                    className={cn(
                      'p-3 md:p-4 rounded-xl border-2 transition-all active:scale-95 touch-manipulation flex flex-col items-center gap-2',
                      settings.soundwaveShape === shape.value
                        ? 'border-primary bg-primary/10 neon-glow'
                        : 'border-border hover:border-primary/50 bg-background/50'
                    )}
                  >
                    <span className="text-xl md:text-2xl text-primary font-mono">{shape.icon}</span>
                    <span className="text-xs md:text-sm text-foreground">{shape.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Playback Settings */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Playback</h2>
            </div>

            <div className="space-y-4 bg-card rounded-xl p-4 md:p-6 border border-border">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm md:text-base">Soundwave Animation</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Show animated soundwave visualizer</p>
                </div>
                <Switch
                  checked={settings.soundwaveEnabled}
                  onCheckedChange={(checked) => updateSettings({ soundwaveEnabled: checked })}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm md:text-base">Auto-Play Next</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Automatically play next track when current ends</p>
                  </div>
                  <Switch
                    checked={settings.autoPlayNext}
                    onCheckedChange={(checked) => updateSettings({ autoPlayNext: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm md:text-base">Mini Player Mode</p>
                    <p className="text-xs md:text-sm text-muted-foreground">Show compact player bar</p>
                  </div>
                  <Switch
                    checked={settings.miniPlayerMode}
                    onCheckedChange={(checked) => updateSettings({ miniPlayerMode: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Playlist Settings */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <ListMusic className="w-6 h-6 text-primary" />
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">Playlist & Queue</h2>
            </div>

            <div className="bg-card rounded-xl p-4 md:p-6 border border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground text-sm md:text-base">Clear All Data</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Remove all tracks from playlist and queue</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleClearPlaylist}
                  className="flex items-center gap-2 active:scale-95 touch-manipulation w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </section>

          {/* Decorative Soundwave Section */}
          <section className="mb-10">
            <div className="bg-card rounded-xl p-6 md:p-8 border border-border flex flex-col items-center gap-4">
              <p className="text-base md:text-lg font-medium text-foreground">Your Music, Your Vibe</p>
              <div className="flex items-end gap-1 h-16">
                {[...Array(15)].map((_, index) => (
                  <div
                    key={index}
                    className="w-1.5 md:w-2 bg-primary rounded-full soundwave-bar"
                    style={{
                      height: `${20 + Math.random() * 40}px`,
                      animationDelay: `${index * 0.08}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">NYRA - Feel the Pulse</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Settings;