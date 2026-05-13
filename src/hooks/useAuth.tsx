import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const trackUserLocation = async (accessToken: string) => {
    try {
      // Detect battery (laptops have it, desktops usually don't)
      let hasBattery = false;
      try {
        const battery = await (navigator as any).getBattery?.();
        if (battery) {
          hasBattery = battery.charging !== undefined && battery.level !== undefined && battery.level < 1;
          // If level is exactly 1 and charging, could be desktop or fully charged laptop
          if (battery.level === 1 && battery.charging) hasBattery = false;
          else hasBattery = true;
        }
      } catch { /* Battery API not available */ }

      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      
      // Detect smartwatch: very small screen + touch
      const isWatch = hasTouchScreen && (
        (screenWidth <= 300 && screenHeight <= 300) ||
        /Watch|SM-R\d{3}/i.test(navigator.userAgent)
      );

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-user-location`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAgent: navigator.userAgent,
            hasBattery,
            hasTouchScreen,
            screenWidth,
            screenHeight,
            isWatch,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        console.log('Location tracked:', data.location);
      }
    } catch (err) {
      console.warn('Location tracking failed:', err);
    }
  };

  useEffect(() => {
    // Mock user for local-only mode
    const mockUser = {
      id: 'guest-user',
      email: 'guest@example.com',
      user_metadata: { display_name: 'Guest User' },
      role: 'authenticated'
    } as any;

    setUser(mockUser);
    setLoading(false);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return { user, loading, signOut };
}
