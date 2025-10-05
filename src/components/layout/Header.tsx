
"use client";

import Link from 'next/link';
import Logo from './Logo';
import { UserNav } from './UserNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Suspense } from 'react';

const HeaderContent = () => {
    const { user } = useAuth();
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
            <Logo />
            <nav className="ml-6 hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link
                href="/courses"
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
                Courses
            </Link>
            <Link
                href="/about"
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
                About
            </Link>
            </nav>
            <div className="ml-auto flex items-center space-x-2">
            {!user ? (
                <>
                <Button variant="ghost" asChild>
                    <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild>
                    <Link href="/auth/register">Sign Up</Link>
                </Button>
                </>
            ) : (
                 <UserNav />
            )}
            </div>
        </div>
        </header>
    )
}


const Header = () => {
  return (
    <Suspense>
        <HeaderContent />
    </Suspense>
  );
};

export default Header;
