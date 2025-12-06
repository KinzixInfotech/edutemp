'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { School, Menu, LogIn, LogOut, User, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function PublicHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [parentData, setParentData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let subscription;
        const initAuth = async () => {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );

            // Initial check
            const { data: { session } } = await supabase.auth.getSession();
            handleAuthChange(session);

            // Listen for changes
            const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
                handleAuthChange(session);
            });
            subscription = sub;
        };

        initAuth();

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const handleAuthChange = (session) => {
        setUser(session?.user || null);
        if (session?.user && typeof window !== 'undefined') {
            const storedData = localStorage.getItem('parentUser');
            if (storedData) {
                setParentData(JSON.parse(storedData));
            }
        } else {
            setParentData(null);
        }
        setLoading(false);
    };



    const handleLogout = async () => {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );

            await supabase.auth.signOut();
            setUser(null);
            setParentData(null);

            // Clear localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('parentUser');
            }

            window.location.href = '/explore';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const navLinks = [
        { href: '/explore', label: 'Home' },
        { href: '/explore/schools', label: 'Schools' },
        { href: 'https://www.edubreezy.com/', label: 'ERP' },
        { href: '/explore/about', label: 'About' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo - Left */}
                    <Link href="/explore" className="flex items-center gap-2 shrink-0">
                        <Image src='/edu_ex.png' width={120} height={35} alt="EduBreezy" priority className="md:w-[150px] md:h-[40px]" />
                    </Link>

                    {/* Desktop Navigation - Center */}
                    <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium transition-colors hover:text-primary whitespace-nowrap"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop Actions - Right */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                        {loading ? (
                            <div className="h-10 w-32 animate-pulse bg-muted rounded" />
                        ) : user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={parentData?.profilePicture || user.user_metadata?.avatar_url} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {(parentData?.name || user.email)?.charAt(0).toUpperCase() || 'P'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="hidden lg:inline">{parentData?.name || user.email?.split('@')[0]}</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>
                                        <div className="space-y-1">
                                            <p className="font-medium">{parentData?.name || 'Parent'}</p>
                                            {parentData?.parent?.school && (
                                                <p className="text-xs text-muted-foreground">
                                                    {parentData.parent.school.name}
                                                </p>
                                            )}
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/explore/profile" className="flex items-center cursor-pointer">
                                            <User className="h-4 w-4 mr-2" />
                                            Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout}>
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <>
                                <Link href="/explore/login">
                                    <Button variant="ghost" size="sm" className="gap-2">
                                        <LogIn className="h-4 w-4" />
                                        <span className="hidden lg:inline">Login</span>
                                    </Button>
                                </Link>
                                <Link href="/login">
                                    <Button size="sm" className="gap-2">
                                        <School className="h-4 w-4" />
                                        <span className="hidden lg:inline">School Login</span>
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
                            {/* Header */}
                            <div className="flex items-center h-16 px-6 border-b shrink-0">
                                <Link href="/explore" onClick={() => setMobileMenuOpen(false)}>
                                    <Image src='/edu_ex.png' width={120} height={36} alt="EduBreezy" priority />
                                </Link>
                            </div>

                            {/* Navigation Links */}
                            <nav className="flex-1 py-6 overflow-y-auto">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center justify-between h-12 px-6 text-base font-medium border-b text-foreground/80 hover:text-primary hover:bg-muted/50 transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.label}
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                    </Link>
                                ))}
                            </nav>

                            {/* Bottom Section - Buttons */}
                            <div className="shrink-0 border-t p-6 space-y-3">
                                {loading ? (
                                    <div className="h-12 bg-muted animate-pulse rounded-lg" />
                                ) : user ? (
                                    <>
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={parentData?.profilePicture || user.user_metadata?.avatar_url} />
                                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                    {(parentData?.name || user.email)?.charAt(0).toUpperCase() || 'P'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{parentData?.name || user.email?.split('@')[0]}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        {/* Buttons */}
                                        <Link href="/explore/profile" onClick={() => setMobileMenuOpen(false)} className="block">
                                            <Button variant="outline" className="w-full h-12 gap-2 text-sm">
                                                <User className="h-4 w-4" />
                                                My Profile
                                            </Button>
                                        </Link>
                                        <Button
                                            className="w-full h-12 gap-2 text-sm"
                                            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign Out
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/explore/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                                            <Button variant="outline" className="w-full h-12 gap-2 text-sm font-medium">
                                                <LogIn className="h-4 w-4" />
                                                Parent Login
                                            </Button>
                                        </Link>
                                        <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                                            <Button className="w-full h-12 gap-2 text-sm font-medium">
                                                <School className="h-4 w-4" />
                                                School Login
                                            </Button>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}

