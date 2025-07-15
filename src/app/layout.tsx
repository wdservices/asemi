import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'Asemi - Online Courses & AI Tools',
  description: 'Learn new skills with expert-led video courses on Asemi.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
