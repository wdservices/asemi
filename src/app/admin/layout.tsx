
"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAuth } from '@/hooks/use-auth-mock';
import { SidebarProvider } from '@/components/ui/sidebar'; // Import SidebarProvider


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login?redirect=/admin/dashboard');
      } else if (!isAdmin) {
        router.push('/dashboard'); // Redirect non-admins to user dashboard
      }
    }
  }, [user, loading, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        Loading admin area or checking permissions...
      </div>
    );
  }
  
  return (
    <SidebarProvider> {/* Wrap with SidebarProvider */}
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AdminSidebar /> {/* This will be the desktop sidebar */}
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 group-data-[collapsible=icon]:sm:pl-[calc(var(--sidebar-width-icon)_+_1rem)] group-data-[collapsible=offcanvas]:sm:pl-0 transition-[padding-left] duration-200 ease-linear"> {/* Adjust pl based on sidebar state */}
          <AdminHeader />
          <main className="flex-1 p-4 sm:px-6 sm:py-0 space-y-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}