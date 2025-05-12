
import Link from 'next/link';
import Logo from './Logo';
import { UserNav } from './UserNav';
import { Button } from '@/components/ui/button';
import { Search, Wand2 } from 'lucide-react'; // Added Wand2
import { Input } from '@/components/ui/input';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <Logo />
        <nav className="ml-6 flex items-center space-x-4 lg:space-x-6">
          <Link
            href="/courses"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            Courses
          </Link>
           <Link
            href="/marketplace"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground flex items-center gap-1"
          >
             <Wand2 className="h-4 w-4" /> Marketplace
          </Link>
          {/* Add more nav links here if needed, e.g., Categories, For Business */}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          {/* Search Bar - simplified */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Search courses..." className="h-9 w-full rounded-md pl-9 md:w-[200px] lg:w-[300px]" />
          </div>
          <UserNav />
        </div>
      </div>
    </header>
  );
};

export default Header;
