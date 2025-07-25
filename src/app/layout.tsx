
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'Asemi - Online Courses & AI Tools',
  description: 'Asemi is your platform for high-quality online courses and a marketplace for powerful AI tools.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
