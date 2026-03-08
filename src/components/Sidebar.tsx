import { Home, Search, ListMusic, Heart, Settings, Menu, X, Users, Shield, Gamepad2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import nyraLogo from '@/assets/nyra-logo.png';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { gradient } = useTheme();
  const { user } = useAuth();

  const isAdmin = user?.email === 'admin@gmail.com';

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'search', label: 'Search', icon: Search, path: '/' },
    { id: 'artists', label: 'Artists', icon: Users, path: '/artists' },
    { id: 'playlists', label: 'Playlists', icon: ListMusic, path: '/playlists' },
    { id: 'favorites', label: 'Favorites', icon: Heart, path: '/favorites' },
    { id: 'ai-dj', label: 'AI DJ', icon: Sparkles, path: '/ai-dj' },
    // { id: 'games', label: 'Games', icon: Gamepad2, path: '/games' }, // Hidden for now
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    // Admin link only visible to admin
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Shield, path: '/admin' }] : []),
  ];

  const handleNavClick = (item: typeof menuItems[0]) => {
    onTabChange(item.id);
    navigate(item.path);
    setMobileOpen(false);
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
          <img src={nyraLogo} alt="NYRA Logo" className="w-10 h-10 rounded-xl object-cover" />
          <div>
            <span className="text-2xl font-bold text-primary theme-gradient-text">
              NYRA
            </span>
            <p className="text-[10px] text-muted-foreground tracking-widest">FEEL THE PULSE</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
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

        {/* Bottom Section */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            <p>© 2026 NYRA</p>
            <p className="mt-1">Powered by Jarvis</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
