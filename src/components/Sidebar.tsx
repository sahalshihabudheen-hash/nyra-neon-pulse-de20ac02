import { Home, Search, ListMusic, Heart, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import nyraLogo from '@/assets/nyra-logo.png';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'search', label: 'Search', icon: Search, path: '/' },
  { id: 'playlists', label: 'Playlists', icon: ListMusic, path: '/playlist' },
  { id: 'favorites', label: 'Favorites', icon: Heart, path: '/' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/' },
];

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-sidebar border-r border-border flex-col z-40">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <img src={nyraLogo} alt="NYRA Logo" className="w-10 h-10 rounded-xl object-cover" />
        <span className="text-2xl font-bold neon-text">NYRA</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'playlists' 
              ? location.pathname === '/playlist'
              : item.id === activeTab;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (item.id === 'playlists') {
                      navigate('/playlist');
                    } else {
                      onTabChange(item.id);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300',
                    isActive
                      ? 'bg-primary text-primary-foreground neon-glow'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

    </aside>
  );
};

export default Sidebar;
