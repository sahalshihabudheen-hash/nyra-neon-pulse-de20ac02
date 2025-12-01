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
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 md:h-20 bg-background/80 backdrop-blur-xl border-b border-border z-30 flex items-center justify-between px-4 md:px-8">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 md:pl-12 pr-4 h-10 md:h-12 bg-secondary border-border rounded-full text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4 ml-4 md:ml-8">
        <button className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <Bell className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
