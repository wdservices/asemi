
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'; // Assuming this path is correct for your ui/sidebar
import Logo from '@/components/layout/Logo';
import { UserNav } from '@/components/layout/UserNav'; // Or a specific AdminUserNav
import { LayoutDashboard, BookOpen, Users, BarChart2, Settings, PlusCircle, Edit3, LogOut, Wand2, Store } from 'lucide-react'; // Added Wand2 and Store icons
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/use-auth-mock';
import { cn } from "@/lib/utils"; // Import cn utility function
import { Separator } from '../ui/separator'; // Import Separator


const AdminSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const isSubActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="h-full hidden sm:flex"> {/* Add hidden sm:flex */}
      <SidebarHeader className="border-b">
        <div className="p-2">
         <Logo size="md" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/admin/dashboard')}
              tooltip={{ children: "Dashboard", side: "right", align: "center" }}
            >
              <Link href="/admin/dashboard"><LayoutDashboard /> <span>Dashboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarGroup>
            <SidebarGroupLabel>Content</SidebarGroupLabel>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isActive('/admin/courses')}
                    tooltip={{ children: "Courses", side: "right", align: "center" }}
                >
                    <Link href="/admin/courses"><BookOpen /> <span>Courses</span></Link>
                </SidebarMenuButton>
                <SidebarMenuSub className={isActive('/admin/courses') ? 'block' : 'hidden'}>
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isSubActive('/admin/courses')}>
                            <Link href="/admin/courses">All Courses</Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isSubActive('/admin/courses/new')}>
                            <Link href="/admin/courses/new">Add New Course</Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                </SidebarMenuSub>
            </SidebarMenuItem>
            {/* Add other content management links like Categories, Instructors */}
          </SidebarGroup>

          <SidebarSeparator />

           <SidebarGroup>
            <SidebarGroupLabel>Marketplace</SidebarGroupLabel>
             <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isActive('/admin/marketplace')}
                    tooltip={{ children: "AI Tools", side: "right", align: "center" }}
                >
                    <Link href="/admin/marketplace"><Store /> <span>AI Tools</span></Link>
                </SidebarMenuButton>
                 <SidebarMenuSub className={isActive('/admin/marketplace') ? 'block' : 'hidden'}>
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isSubActive('/admin/marketplace')}>
                            <Link href="/admin/marketplace">All Tools</Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isSubActive('/admin/marketplace/new')}>
                            <Link href="/admin/marketplace/new">Add New Tool</Link>
                        </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    {/* Add Edit Tool link if needed, perhaps implicitly */}
                </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
             <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isActive('/admin/users')}
                    tooltip={{ children: "Users", side: "right", align: "center" }}
                >
                    <Link href="/admin/users"><Users /> <span>Users</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isActive('/admin/analytics')}
                    tooltip={{ children: "Analytics", side: "right", align: "center" }}
                >
                    <Link href="/admin/analytics"><BarChart2 /> <span>Analytics</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isActive('/admin/settings')}
                    tooltip={{ children: "Settings", side: "right", align: "center" }}
                >
                    <Link href="/admin/settings"><Settings /> <span>Settings</span></Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroup>

        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        {/* You can put UserNav here if not in a separate AdminHeader */}
        {/* <UserNav /> */}
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" /> <span>Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

// Mobile Sidebar Component (extracted for clarity in AdminHeader)
export const MobileAdminSidebarContent = () => {
    const pathname = usePathname();
    const { logout } = useAuth();
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b">
                <Logo size="md" />
            </div>
            <nav className="flex-grow px-4 py-2 space-y-1">
                <Link href="/admin/dashboard" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium", isActive('/admin/dashboard') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground')}>
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Link>
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Content</p>
                <Link href="/admin/courses" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium", isActive('/admin/courses') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground')}>
                    <BookOpen className="h-4 w-4" /> Courses
                </Link>
                <Link href="/admin/courses/new" className={cn("flex items-center gap-2 rounded-md pl-8 pr-3 py-2 text-sm font-medium", isActive('/admin/courses/new') ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground')}>
                    <PlusCircle className="h-4 w-4" /> Add New Course
                </Link>

                <Separator className="my-2" />
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Marketplace</p>
                 <Link href="/admin/marketplace" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium", isActive('/admin/marketplace') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground')}>
                    <Store className="h-4 w-4" /> AI Tools
                </Link>
                <Link href="/admin/marketplace/new" className={cn("flex items-center gap-2 rounded-md pl-8 pr-3 py-2 text-sm font-medium", isActive('/admin/marketplace/new') ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground')}>
                    <PlusCircle className="h-4 w-4" /> Add New Tool
                </Link>

                <Separator className="my-2" />
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Management</p>
                <Link href="/admin/users" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium", isActive('/admin/users') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground')}>
                    <Users className="h-4 w-4" /> Users
                </Link>
                 <Link href="/admin/analytics" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium", isActive('/admin/analytics') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground')}>
                    <BarChart2 className="h-4 w-4" /> Analytics
                </Link>
                 <Link href="/admin/settings" className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium", isActive('/admin/settings') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground')}>
                    <Settings className="h-4 w-4" /> Settings
                </Link>
            </nav>
            <div className="mt-auto p-4 border-t">
                 <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
                    <LogOut className="h-4 w-4" /> <span>Logout</span>
                </Button>
            </div>
        </div>
    );
};


export default AdminSidebar;


