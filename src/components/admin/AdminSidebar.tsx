
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/layout/Logo';
import { LayoutDashboard, Users, BarChart2, Settings, LogOut, Book, ShoppingBag, TrendingUp, FileText, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from "@/lib/utils";
import { Separator } from '@/components/ui/separator';

const AdminSidebar = () => {
    const pathname = usePathname();
    const { logout } = useAuth();
    
    const isActive = (path: string, exact = false) => {
        return exact ? pathname === path : pathname.startsWith(path);
    };

    const navigationItems = [
        {
            title: "Overview",
            items: [
                {
                    title: "Dashboard",
                    href: "/admin/dashboard",
                    icon: LayoutDashboard,
                    active: isActive('/admin/dashboard', true)
                }
            ]
        },
        {
            title: "Content Management",
            items: [
                {
                    title: "Courses",
                    href: "/admin/courses",
                    icon: Book,
                    active: isActive('/admin/courses'),
                    subItems: [
                        { title: "All Courses", href: "/admin/courses" },
                        { title: "Add New Course", href: "/admin/courses/new" }
                    ]
                },
                {
                    title: "Marketplace",
                    href: "/admin/marketplace",
                    icon: ShoppingBag,
                    active: isActive('/admin/marketplace'),
                    subItems: [
                        { title: "All Items", href: "/admin/marketplace" },
                        { title: "Add New Item", href: "/admin/marketplace/new" }
                    ]
                }
            ]
        },
        {
            title: "Analytics & Users",
            items: [
                {
                    title: "Users",
                    href: "/admin/users",
                    icon: Users,
                    active: isActive('/admin/users'),
                    subItems: [
                        { title: "All Users", href: "/admin/users" },
                        { title: "Manual Enrollment", href: "/admin/manual-enroll" },
                        { title: "Enroll Specific Users", href: "/admin/enroll-specific" }
                    ]
                },
                {
                    title: "Analytics",
                    href: "/admin/analytics",
                    icon: TrendingUp,
                    active: isActive('/admin/analytics')
                },
                {
                    title: "Reports",
                    href: "/admin/reports",
                    icon: FileText,
                    active: isActive('/admin/reports')
                }
            ]
        }
    ];

    return (
        <div className="hidden border-r bg-gradient-to-b from-background to-muted/20 md:block">
            <div className="flex h-full max-h-screen flex-col">
                {/* Header */}
                <div className="flex h-16 items-center border-b px-6">
                    <Logo size="md" />
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-auto py-4">
                    <nav className="px-4 space-y-6">
                        {navigationItems.map((section, index) => (
                            <div key={index} className="space-y-2">
                                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {section.title}
                                </h3>
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <div key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                                    "hover:bg-accent hover:text-accent-foreground",
                                                    item.active 
                                                        ? "bg-primary text-primary-foreground shadow-sm" 
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {item.title}
                                            </Link>
                                            
                                            {/* Sub-items */}
                                            {item.subItems && item.active && (
                                                <div className="ml-7 mt-1 space-y-1">
                                                    {item.subItems.map((subItem) => (
                                                        <Link
                                                            key={subItem.href}
                                                            href={subItem.href}
                                                            className={cn(
                                                                "block rounded-md px-3 py-1.5 text-xs transition-colors",
                                                                "hover:bg-accent hover:text-accent-foreground",
                                                                isActive(subItem.href, true)
                                                                    ? "bg-accent text-accent-foreground font-medium"
                                                                    : "text-muted-foreground"
                                                            )}
                                                        >
                                                            {subItem.title}
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Settings & Logout */}
                <div className="border-t p-4 space-y-2">
                    <Link
                        href="/admin/settings"
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive('/admin/settings')
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground"
                        )}
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Link>
                    
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" 
                        onClick={logout}
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
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

    const navigationItems = [
        {
            title: "Overview",
            items: [
                {
                    title: "Dashboard",
                    href: "/admin/dashboard",
                    icon: LayoutDashboard,
                    active: isActive('/admin/dashboard', true)
                }
            ]
        },
        {
            title: "Content Management",
            items: [
                {
                    title: "Courses",
                    href: "/admin/courses",
                    icon: Book,
                    active: isActive('/admin/courses'),
                    subItems: [
                        { title: "All Courses", href: "/admin/courses" },
                        { title: "Add New Course", href: "/admin/courses/new" }
                    ]
                },
                {
                    title: "Marketplace",
                    href: "/admin/marketplace",
                    icon: ShoppingBag,
                    active: isActive('/admin/marketplace'),
                    subItems: [
                        { title: "All Items", href: "/admin/marketplace" },
                        { title: "Add New Item", href: "/admin/marketplace/new" }
                    ]
                }
            ]
        },
        {
            title: "Analytics & Users",
            items: [
                {
                    title: "Users",
                    href: "/admin/users",
                    icon: Users,
                    active: isActive('/admin/users'),
                    subItems: [
                        { title: "All Users", href: "/admin/users" },
                        { title: "Manual Enrollment", href: "/admin/manual-enroll" },
                        { title: "Enroll Specific Users", href: "/admin/enroll-specific" }
                    ]
                },
                {
                    title: "Analytics",
                    href: "/admin/analytics",
                    icon: TrendingUp,
                    active: isActive('/admin/analytics')
                },
                {
                    title: "Reports",
                    href: "/admin/reports",
                    icon: FileText,
                    active: isActive('/admin/reports')
                }
            ]
        }
    ];

    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <div className="flex h-16 items-center border-b px-6 bg-background">
                <Logo size="md" />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-auto py-4">
                <nav className="px-4 space-y-6">
                    {navigationItems.map((section, index) => (
                        <div key={index} className="space-y-2">
                            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {section.title}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item) => (
                                    <div key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                                "hover:bg-accent hover:text-accent-foreground",
                                                item.active 
                                                    ? "bg-primary text-primary-foreground shadow-sm" 
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.title}
                                        </Link>
                                        
                                        {/* Sub-items */}
                                        {item.subItems && item.active && (
                                            <div className="ml-7 mt-1 space-y-1">
                                                {item.subItems.map((subItem) => (
                                                    <Link
                                                        key={subItem.href}
                                                        href={subItem.href}
                                                        className={cn(
                                                            "block rounded-md px-3 py-1.5 text-xs transition-colors",
                                                            "hover:bg-accent hover:text-accent-foreground",
                                                            isActive(subItem.href, true)
                                                                ? "bg-accent text-accent-foreground font-medium"
                                                                : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {subItem.title}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Settings & Logout */}
            <div className="border-t p-4 space-y-2 bg-background">
                <Link
                    href="/admin/settings"
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive('/admin/settings')
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground"
                    )}
                >
                    <Settings className="h-4 w-4" />
                    Settings
                </Link>
                
                <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" 
                    onClick={logout}
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
};

export default AdminSidebar;
