
"use client";

import Link from 'next/link';
import Logo from './Logo';
import { UserNav } from './UserNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Suspense, useState } from 'react';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

const HeaderContent = () => {
    const { user } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center">
            <Logo />
            
            {/* Navigation - Desktop and Mobile */}
            <nav className="ml-6 flex items-center space-x-4 lg:space-x-6">
            <Link
                href="/courses"
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
                Courses
            </Link>
            <Link
                href="/about"
                className="hidden md:block text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
                About
            </Link>
            </nav>
            
            {/* Desktop Auth */}
            <div className="ml-auto hidden md:flex items-center space-x-2">
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
            
            {/* Mobile Menu */}
            <div className="ml-auto flex md:hidden items-center space-x-2">
                {user && <UserNav />}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                        <nav className="flex flex-col space-y-4 mt-8">
                            <Link
                                href="/courses"
                                className="text-lg font-medium text-foreground/70 transition-colors hover:text-foreground"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Courses
                            </Link>
                            <Link
                                href="/about"
                                className="text-lg font-medium text-foreground/70 transition-colors hover:text-foreground"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                About
                            </Link>
                            {!user && (
                                <>
                                    <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start">
                                            Login
                                        </Button>
                                    </Link>
                                    <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                                        <Button className="w-full">
                                            Sign Up
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </nav>
                    </SheetContent>
                </Sheet>
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
