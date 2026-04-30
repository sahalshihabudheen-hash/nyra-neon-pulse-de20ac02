import { Home, Search, ListMusic, Heart, Settings, Menu, X, Users, Shield, Gamepad2, Sparkles, AlertTriangle, Wand2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import nyraLogo from '@/assets/nyra-logo.png';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAppSettings } from '@/hooks/useAppSettings';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { gradient } = useTheme();
  const { user } = useAuth();
  const { maintenance } = useMaintenanceMode();
  const { settings: appSettings } = useAppSettings();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setIsAdmin(false); return; }
      if (user.email === 'admin@gmail.com' || user.email === 'sahalshihabudheen@gmail.com') { setIsAdmin(true); return; }
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const allMenuItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'search', label: 'Search', icon: Search, path: '/' },
    { id: 'artists', label: 'Artists', icon: Users, path: '/artists' },
    { id: 'playlists', label: 'Playlists', icon: ListMusic, path: '/playlists' },
    { id: 'favorites', label: 'Favorites', icon: Heart, path: '/favorites' },
    { id: 'ai-dj', label: 'AI DJ', icon: Sparkles, path: '/ai-dj' },
    { id: 'games', label: 'Games', icon: Gamepad2, path: '/games' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Shield, path: '/admin' }] : []),
  ];

  // Filter out hidden tabs (never hide home, settings, admin)
  const protectedTabs = ['home', 'settings', 'admin'];
  const menuItems = allMenuItems.filter(
    item => protectedTabs.includes(item.id) || !appSettings.hidden_tabs.includes(item.id)
  );

  const handleNavClick = (item: typeof menuItems[0]) => {
    onTabChange(item.id);
    navigate(item.path);
    setMobileOpen(false);

    // If Search clicked, focus the search input after navigation
    if (item.id === 'search') {
      setTimeout(() => {
        const input = document.querySelector('header input') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
    }
  };

  const isItemActive = (item: typeof menuItems[0]) => {
    if (item.path === '/admin' && location.pathname === '/admin') return true;
    if (item.path === '/settings' && location.pathname === '/settings') return true;
    if (item.path === '/games' && location.pathname === '/games') return true;
    if (item.path === '/ai-dj' && location.pathname === '/ai-dj') return true;
    if (item.id === 'playlists' && location.pathname.startsWith('/playlist')) return true;
    if (item.id === 'artists' && (location.pathname === '/artists' || location.pathname.startsWith('/artist'))) return true;
    if (item.path === '/' && location.pathname === '/' && item.id === activeTab) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-border flex-col z-40 transition-transform duration-300',
          mobileOpen ? 'translate-x-0 flex' : '-translate-x-full md:translate-x-0 md:flex hidden md:block'
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <img src={appSettings.app_logo_url || nyraLogo} alt={`${appSettings.app_name} Logo`} className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <span className="text-2xl font-bold text-primary theme-gradient-text">
              {appSettings.app_name}
            </span>
            <p className="text-[10px] text-muted-foreground tracking-widest">{appSettings.app_tagline}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto min-h-0">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300',
                      isActive
                        ? 'bg-primary text-primary-foreground neon-glow'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                    style={
                      isActive
                        ? gradient.enabled
                          ? { background: 'var(--theme-gradient)' }
                          : { backgroundColor: 'hsl(var(--primary))' }
                        : undefined
                    }
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Maintenance Notice */}
        {maintenance.enabled && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold">Maintenance Mode</span>
            </div>
            <p className="text-[10px] text-yellow-500/70 mt-1">Site is currently under maintenance for other users.</p>
          </div>
        )}

        {/* Bottom Section */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            <p>{appSettings.footer_text}</p>
            <p className="mt-1">{appSettings.footer_powered_by}</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
