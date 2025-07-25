
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/layout/Logo';
import { LayoutDashboard, Users, BarChart2, Settings, LogOut, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const AdminSidebar = () => {
    const pathname = usePathname();
    const { logout } = useAuth();
    const isActive = (path: string, exact = false) => {
        return exact ? pathname === path : pathname.startsWith(path);
    };

    const getActiveModule = () => {
        if (isActive('/admin/exams')) return 'exams';
        return '';
    }

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Logo size="md" />
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            <Link
              href="/admin/dashboard"
              className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isActive('/admin/dashboard', true) && "bg-muted text-primary"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            <Accordion type="single" collapsible defaultValue={getActiveModule()} className="w-full">
              <AccordionItem value="exams" className="border-b-0">
                <AccordionTrigger className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline",
                    isActive('/admin/exams') && 'text-primary'
                )}>
                   <FileText className="h-4 w-4" />
                   Exams
                </AccordionTrigger>
                <AccordionContent className="pl-8">
                    <nav className="grid gap-1">
                        <Link href="/admin/exams" className={cn("rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive('/admin/exams', true) && 'text-primary')}>
                            All Exams
                        </Link>
                         <Link href="/admin/exams/new" className={cn("rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive('/admin/exams/new') && 'text-primary')}>
                            Add New Exam
                        </Link>
                    </nav>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Link
              href="/admin/users"
              className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isActive('/admin/users') && "bg-muted text-primary"
              )}
            >
              <Users className="h-4 w-4" />
              Users
            </Link>
             <Link
              href="#"
              className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isActive('/admin/analytics') && "bg-muted text-primary"
              )}
            >
              <BarChart2 className="h-4 w-4" />
              Analytics
            </Link>
            <Link
              href="#"
              className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isActive('/admin/settings') && "bg-muted text-primary"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>
        <div className="mt-auto p-4 border-t">
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
                <LogOut className="h-4 w-4" /> <span>Logout</span>
            </Button>
        </div>
      </div>
    </div>
  );
};


export const MobileAdminSidebarContent = () => {
    const pathname = usePathname();
    const { logout } = useAuth();
    const isActive = (path: string, exact = false) => {
        return exact ? pathname === path : pathname.startsWith(path);
    };

    const getActiveModule = () => {
        if (isActive('/admin/exams')) return 'exams';
        return '';
    }

    return (
        <div className="flex flex-col h-full bg-muted/40">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 bg-background">
              <Logo size="md" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <nav className="grid items-start p-2 text-sm font-medium lg:p-4">
                <Link
                  href="/admin/dashboard"
                  className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      isActive('/admin/dashboard', true) && "bg-muted text-primary"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>

                <Accordion type="single" collapsible defaultValue={getActiveModule()} className="w-full">
                   <AccordionItem value="exams" className="border-b-0">
                    <AccordionTrigger className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline",
                        isActive('/admin/exams') && 'text-primary'
                    )}>
                       <FileText className="h-4 w-4" />
                       Exams
                    </AccordionTrigger>
                    <AccordionContent className="pl-8">
                        <nav className="grid gap-1">
                            <Link href="/admin/exams" className={cn("block rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive('/admin/exams', true) && 'text-primary')}>
                                All Exams
                            </Link>
                             <Link href="/admin/exams/new" className={cn("block rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary", isActive('/admin/exams/new') && 'text-primary')}>
                                Add New Exam
                            </Link>
                        </nav>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                <Link
                  href="/admin/users"
                  className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      isActive('/admin/users') && "bg-muted text-primary"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
                 <Link
                  href="#"
                  className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      isActive('/admin/analytics') && "bg-muted text-primary"
                  )}
                >
                  <BarChart2 className="h-4 w-4" />
                  Analytics
                </Link>
                <Link
                  href="#"
                  className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                      isActive('/admin/settings') && "bg-muted text-primary"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </nav>
            </div>
             <div className="mt-auto p-4 border-t bg-background">
                 <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
                    <LogOut className="h-4 w-4" /> <span>Logout</span>
                </Button>
            </div>
        </div>
    );
};

export default AdminSidebar;
