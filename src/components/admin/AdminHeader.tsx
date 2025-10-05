
"use client";

import { UserNav } from '@/components/layout/UserNav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Menu, Search, Bell, Settings } from 'lucide-react';
import { MobileAdminSidebarContent } from './AdminSidebar';
import { usePathname } from 'next/navigation';

const AdminHeader = () => {
  const pathname = usePathname();
  
  // Get page title based on current path
  const getPageTitle = () => {
    if (pathname === '/admin/dashboard') return 'Dashboard';
    if (pathname.startsWith('/admin/courses')) return 'Courses';
    if (pathname.startsWith('/admin/marketplace')) return 'Marketplace';
    if (pathname.startsWith('/admin/users')) return 'Users';
    if (pathname.startsWith('/admin/analytics')) return 'Analytics';
    if (pathname.startsWith('/admin/reports')) return 'Reports';
    if (pathname.startsWith('/admin/settings')) return 'Settings';
    return 'Admin Panel';
  };

  const getBreadcrumb = () => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length <= 2) return null;
    
    return segments.slice(1).map((segment, index) => {
      const isLast = index === segments.length - 2;
      const title = segment.charAt(0).toUpperCase() + segment.slice(1);
      
      return (
        <span key={segment} className="flex items-center">
          {index > 0 && <span className="mx-2 text-muted-foreground">/</span>}
          <span className={isLast ? "text-foreground font-medium" : "text-muted-foreground"}>
            {title}
          </span>
        </span>
      );
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden hover:bg-accent"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0 w-full max-w-sm">
            <MobileAdminSidebarContent />
          </SheetContent>
        </Sheet>

        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-foreground">
            {getPageTitle()}
          </h1>
          {getBreadcrumb() && (
            <div className="flex items-center text-sm">
              {getBreadcrumb()}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Bar - Hidden on mobile */}
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative hover:bg-accent">
            <Bell className="h-4 w-4" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              3
            </Badge>
            <span className="sr-only">Notifications</span>
          </Button>

          {/* Quick Settings */}
          <Button variant="ghost" size="icon" className="hover:bg-accent">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Quick Settings</span>
          </Button>

          {/* User Navigation */}
          <UserNav />
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
