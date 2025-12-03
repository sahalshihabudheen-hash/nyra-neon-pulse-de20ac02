import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette, Volume2, ListMusic, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, themes, ThemeName } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
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

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { currentTheme, setTheme, settings, updateSettings } = useTheme();
  const [activeTab, setActiveTab] = useState('settings');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleClearPlaylist = () => {
    localStorage.removeItem('nyra-playlist');
    toast.success('Playlist cleared');
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
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <h1 className="text-4xl font-bold neon-text mb-8">Settings</h1>

          {/* Theme Selection */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Theme</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {(Object.keys(themes) as ThemeName[]).map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => setTheme(themeName)}
                  className={cn(
                    'relative p-4 rounded-xl border-2 transition-all overflow-hidden',
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
                      className="w-12 h-12 rounded-full mx-auto mb-3 shadow-lg"
                      style={{ backgroundColor: themePreview[themeName].color }}
                    />
                    <p className="text-sm font-medium text-foreground text-center">
                      {themePreview[themeName].label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Playback Settings */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <Volume2 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Playback</h2>
            </div>

            <div className="space-y-4 bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Soundwave Animation</p>
                  <p className="text-sm text-muted-foreground">Show animated soundwave visualizer</p>
                </div>
                <Switch
                  checked={settings.soundwaveEnabled}
                  onCheckedChange={(checked) => updateSettings({ soundwaveEnabled: checked })}
                />
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Auto-Play Next</p>
                    <p className="text-sm text-muted-foreground">Automatically play next track when current ends</p>
                  </div>
                  <Switch
                    checked={settings.autoPlayNext}
                    onCheckedChange={(checked) => updateSettings({ autoPlayNext: checked })}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Mini Player Mode</p>
                    <p className="text-sm text-muted-foreground">Show compact player bar</p>
                  </div>
                  <Switch
                    checked={settings.miniPlayerMode}
                    onCheckedChange={(checked) => updateSettings({ miniPlayerMode: checked })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Playlist Settings */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <ListMusic className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">Playlist</h2>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Clear Entire Playlist</p>
                  <p className="text-sm text-muted-foreground">Remove all tracks from your queue</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleClearPlaylist}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Settings;
