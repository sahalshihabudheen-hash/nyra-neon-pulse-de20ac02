import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MaintenanceMode {
  enabled: boolean;
  allowed_emails: string[];
}

export function useMaintenanceMode() {
  const [maintenance, setMaintenance] = useState<MaintenanceMode>({ enabled: false, allowed_emails: [] });
  const [loading, setLoading] = useState(true);

  const fetchMaintenance = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        const val = data.value as unknown as MaintenanceMode;
        setMaintenance({
          enabled: val.enabled ?? false,
          allowed_emails: val.allowed_emails ?? [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch maintenance mode:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMaintenance = async (enabled: boolean) => {
    const newValue = { ...maintenance, enabled };
    const { error } = await supabase
      .from('app_settings')
      .update({ value: newValue as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('key', 'maintenance_mode');

    if (error) throw error;
    setMaintenance(newValue);
  };

  const updateAllowedEmails = async (emails: string[]) => {
    const newValue = { ...maintenance, allowed_emails: emails };
    const { error } = await supabase
      .from('app_settings')
      .update({ value: newValue as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('key', 'maintenance_mode');

    if (error) throw error;
    setMaintenance(newValue);
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  return { maintenance, loading, toggleMaintenance, updateAllowedEmails, refetch: fetchMaintenance };
}
