
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
import { LayoutDashboard, BookOpen, Users, BarChart2, Settings, PlusCircle, Edit3, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/use-auth-mock';


const AdminSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const isSubActive = (path: string) => pathname === path;

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="h-full">
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

export default AdminSidebar;