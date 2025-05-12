
"use client";
import { UserNav } from '@/components/layout/UserNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Search } from 'lucide-react';
import { MobileAdminSidebarContent } from './AdminSidebar'; // Import the mobile content component
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'; // SidebarTrigger for desktop

const AdminHeader = () => {
  // const { toggleSidebar } = useSidebar(); // This hook needs SidebarProvider at the root of admin layout

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       {/* This SidebarTrigger is for the ui/sidebar.tsx component system if used for main layout */}
       {/* <SidebarTrigger className="sm:hidden" />  */}

      {/* Mobile Menu for AdminSidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs p-0 w-[80vw]"> {/* Adjusted width */}
          {/* Embed MobileAdminSidebar content here */}
           <MobileAdminSidebarContent />
        </SheetContent>
      </Sheet>

      <div className="relative ml-auto flex-1 md:grow-0">
        {/* <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        /> */}
      </div>
      <UserNav />
    </header>
  );
};

export default AdminHeader;
