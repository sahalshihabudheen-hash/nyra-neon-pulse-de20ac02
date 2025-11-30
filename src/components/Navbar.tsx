import { Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
}

const Navbar = ({ searchQuery, onSearchChange, onSearch }: NavbarProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-20 bg-background/80 backdrop-blur-xl border-b border-border z-30 flex items-center justify-between px-8">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for songs, artists..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-12 pr-4 h-12 bg-secondary border-border rounded-full text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 ml-8">
        <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
