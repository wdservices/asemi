
"use client";
import { UserNav } from '@/components/layout/UserNav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { MobileAdminSidebarContent } from './AdminSidebar';

const AdminHeader = () => {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0 w-full max-w-sm">
          <MobileAdminSidebarContent />
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        {/* Optional: Add a search form here if needed in the header */}
      </div>
      <UserNav />
    </header>
  );
};

export default AdminHeader;
