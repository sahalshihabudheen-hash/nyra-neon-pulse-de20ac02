import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppSettings {
  app_name: string;
  app_tagline: string;
  footer_text: string;
  footer_powered_by: string;
  app_logo_url?: string;
  hidden_tabs: string[];
}

const defaults: AppSettings = {
  app_name: 'NYRA',
  app_tagline: 'FEEL THE PULSE',
  footer_text: '© 2026 NYRA',
  footer_powered_by: 'Powered by Jarvis',
  hidden_tabs: [],
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['app_name', 'app_tagline', 'footer_text', 'footer_powered_by', 'app_logo_url', 'hidden_tabs']);

      if (error) throw error;

      const s = { ...defaults };
      data?.forEach((row) => {
        const val = row.value as any;
        switch (row.key) {
          case 'app_name':
            if (typeof val === 'string') s.app_name = val;
            break;
          case 'app_tagline':
            if (typeof val === 'string') s.app_tagline = val;
            break;
          case 'footer_text':
            if (typeof val === 'string') s.footer_text = val;
            break;
          case 'footer_powered_by':
            if (typeof val === 'string') s.footer_powered_by = val;
            break;
          case 'app_logo_url':
            if (typeof val === 'string') s.app_logo_url = val;
            break;
          case 'hidden_tabs':
            if (Array.isArray(val)) s.hidden_tabs = val;
            break;
        }
      });

      setSettings(s);
    } catch (err) {
      console.warn('Failed to fetch app settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const handler = () => fetchSettings();
    window.addEventListener('app_settings_updated', handler as EventListener);
    return () => window.removeEventListener('app_settings_updated', handler as EventListener);
  }, [fetchSettings]);

  return { settings, loading, refresh: fetchSettings };
}

