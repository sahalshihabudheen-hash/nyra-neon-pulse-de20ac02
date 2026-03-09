import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, Upload, Image, Type, FileText, Music, Search, Star, Eye, EyeOff, Home, Heart, ListMusic, Users, Sparkles, Settings, Gamepad2 } from 'lucide-react';

interface AppSettings {
  app_name: string;
  app_tagline: string;
  footer_text: string;
  footer_powered_by: string;
  featured_mode: 'auto' | 'manual';
  featured_manual_track: {
    id?: string;
    title?: string;
    thumbnail?: string;
    channel?: string;
  };
  app_logo_url?: string;
  hidden_tabs: string[];
}

const SIDEBAR_TABS = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'artists', label: 'Artists', icon: Users },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'ai-dj', label: 'AI DJ', icon: Sparkles },
];

const AdminAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    app_name: 'NYRA',
    app_tagline: 'FEEL THE PULSE',
    footer_text: '© 2026 NYRA',
    footer_powered_by: 'Powered by Jarvis',
    featured_mode: 'auto',
    featured_manual_track: {},
    hidden_tabs: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['app_name', 'app_tagline', 'footer_text', 'footer_powered_by', 'featured_mode', 'featured_manual_track', 'app_logo_url']);

      if (error) throw error;

      const newSettings = { ...settings };
      data?.forEach((row) => {
        const val = row.value as any;
        switch (row.key) {
          case 'app_name': newSettings.app_name = typeof val === 'string' ? val : 'NYRA'; break;
          case 'app_tagline': newSettings.app_tagline = typeof val === 'string' ? val : 'FEEL THE PULSE'; break;
          case 'footer_text': newSettings.footer_text = typeof val === 'string' ? val : '© 2026 NYRA'; break;
          case 'footer_powered_by': newSettings.footer_powered_by = typeof val === 'string' ? val : 'Powered by Jarvis'; break;
          case 'featured_mode': newSettings.featured_mode = val === 'manual' ? 'manual' : 'auto'; break;
          case 'featured_manual_track': newSettings.featured_manual_track = typeof val === 'object' && val ? val : {}; break;
          case 'app_logo_url': newSettings.app_logo_url = typeof val === 'string' ? val : undefined; break;
        }
      });
      setSettings(newSettings);
    } catch (err) {
      console.error('Failed to fetch app settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    setSaving(key);
    try {
      // Try update first
      const { error: updateError, count } = await supabase
        .from('app_settings')
        .update({ value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() })
        .eq('key', key)
        .select();

      // If no row existed, insert
      if (!count || count === 0) {
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert({ key, value: JSON.parse(JSON.stringify(value)) });
        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }

      toast.success(`${key.replace(/_/g, ' ')} updated!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save setting');
    } finally {
      setSaving(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, GIF, or WebP file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `app-logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache buster
      const url = `${publicUrl}?t=${Date.now()}`;
      setSettings(prev => ({ ...prev, app_logo_url: url }));
      await saveSetting('app_logo_url', url);
      toast.success('Logo uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const searchYouTube = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || data || []);
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const selectFeaturedTrack = async (track: any) => {
    const manualTrack = {
      id: track.videoId || track.id,
      title: track.title,
      thumbnail: track.thumbnail,
      channel: track.channel || track.channelTitle,
    };
    setSettings(prev => ({ ...prev, featured_manual_track: manualTrack }));
    await saveSetting('featured_manual_track', manualTrack);
    setSearchResults([]);
    setSearchQuery('');
    toast.success(`Featured track set to: ${manualTrack.title}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* App Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Image className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>App Branding</CardTitle>
              <CardDescription>Change the app logo, name, and tagline</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-3">
            <label className="text-sm font-medium">App Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-border overflow-hidden bg-secondary flex items-center justify-center">
                {settings.app_logo_url ? (
                  <img src={settings.app_logo_url} alt="App Logo" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Logo
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, GIF, WebP — Max 5MB</p>
              </div>
            </div>
          </div>

          {/* App Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Type className="w-4 h-4" /> App Name
            </label>
            <div className="flex gap-2">
              <Input
                value={settings.app_name}
                onChange={(e) => setSettings(prev => ({ ...prev, app_name: e.target.value }))}
                placeholder="NYRA"
              />
              <Button
                size="sm"
                onClick={() => saveSetting('app_name', settings.app_name)}
                disabled={saving === 'app_name'}
              >
                {saving === 'app_name' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tagline</label>
            <div className="flex gap-2">
              <Input
                value={settings.app_tagline}
                onChange={(e) => setSettings(prev => ({ ...prev, app_tagline: e.target.value }))}
                placeholder="FEEL THE PULSE"
              />
              <Button
                size="sm"
                onClick={() => saveSetting('app_tagline', settings.app_tagline)}
                disabled={saving === 'app_tagline'}
              >
                {saving === 'app_tagline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Footer</CardTitle>
              <CardDescription>Customize the sidebar footer text</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Copyright Text</label>
            <div className="flex gap-2">
              <Input
                value={settings.footer_text}
                onChange={(e) => setSettings(prev => ({ ...prev, footer_text: e.target.value }))}
                placeholder="© 2026 NYRA"
              />
              <Button
                size="sm"
                onClick={() => saveSetting('footer_text', settings.footer_text)}
                disabled={saving === 'footer_text'}
              >
                {saving === 'footer_text' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Powered By</label>
            <div className="flex gap-2">
              <Input
                value={settings.footer_powered_by}
                onChange={(e) => setSettings(prev => ({ ...prev, footer_powered_by: e.target.value }))}
                placeholder="Powered by Jarvis"
              />
              <Button
                size="sm"
                onClick={() => saveSetting('footer_powered_by', settings.footer_powered_by)}
                disabled={saving === 'footer_powered_by'}
              >
                {saving === 'footer_powered_by' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Today */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Featured Today</CardTitle>
              <CardDescription>Control the featured track on the home page</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
            <div>
              <p className="text-sm font-medium">Mode</p>
              <p className="text-xs text-muted-foreground">
                {settings.featured_mode === 'auto'
                  ? 'Automatically rotates from trending tracks daily'
                  : 'Manually selected track shown until changed'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Auto</span>
              <Switch
                checked={settings.featured_mode === 'manual'}
                onCheckedChange={async (checked) => {
                  const mode = checked ? 'manual' : 'auto';
                  setSettings(prev => ({ ...prev, featured_mode: mode }));
                  await saveSetting('featured_mode', mode);
                }}
              />
              <span className="text-xs text-muted-foreground">Manual</span>
            </div>
          </div>

          {/* Manual track selection */}
          {settings.featured_mode === 'manual' && (
            <div className="space-y-3">
              {/* Current featured track */}
              {settings.featured_manual_track?.id && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <img
                    src={settings.featured_manual_track.thumbnail}
                    alt={settings.featured_manual_track.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{settings.featured_manual_track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{settings.featured_manual_track.channel}</p>
                  </div>
                  <Music className="w-4 h-4 text-primary shrink-0" />
                </div>
              )}

              {/* Search for track */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search for a track</label>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search YouTube..."
                    onKeyDown={(e) => e.key === 'Enter' && searchYouTube()}
                  />
                  <Button size="sm" onClick={searchYouTube} disabled={searching}>
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.slice(0, 8).map((track: any) => (
                    <button
                      key={track.videoId || track.id}
                      onClick={() => selectFeaturedTrack(track)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                    >
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.channel || track.channelTitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAppSettings;
