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
        <header className="sticky top-0 z-50 w-full bg-white ">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between gap-4">
                    {/* Logo - Left */}

                    <Link href="/explore" className="flex items-center gap-2 shrink-0">
                        <Image src='/edu.png' width={120} height={30} alt="EduBreezy" priority />
                    </Link>

                    {/* Search Bar - Center (Desktop) */}
                    <div className="hidden md:flex flex-1 max-w-md mx-4">
                        <div className="relative w-full">
                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by school name, zip..."
                                className="w-full h-10 pl-10 pr-4 text-sm rounded-full bg-muted border text-black placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                            />
                        </div>
                    </div>
                    {/* Desktop Navigation + Actions - Right */}
                    <div className="hidden md:flex items-center gap-6 shrink-0">
                        <nav className="flex items-center gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm font-medium  hover:text-blue-600 transition-colors whitespace-nowrap"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="flex items-center gap-2.5 pl-4 border-l border-[#475569]">
                            {loading ? (
                                <div className="h-10 w-32 animate-pulse bg-[#334155] rounded-full" />
                            ) : user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="gap-2 text-white hover:bg-[#334155]">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={parentData?.profilePicture || user.user_metadata?.avatar_url} />
                                                <AvatarFallback className="bg-blue-500/20 text-blue-300 font-semibold">
                                                    {(parentData?.name || user.email)?.charAt(0).toUpperCase() || 'P'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="hidden lg:inline text-sm">{parentData?.name || user.email?.split('@')[0]}</span>
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
                                            <span className="hidden lg:inline">Log In</span>
                                        </Button>
                                    </Link>
                                    <Link href="/login">
                                        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 font-semibold shadow-md">
                                            <School className="h-4 w-4" />
                                            <span className="hidden lg:inline">School Login</span>
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-[#334155]">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col bg-[#1e293b] border-l-[#334155]">
                            {/* Header */}
                            <div className="flex items-center h-16 px-6 border-b border-[#334155] shrink-0">
                                <Link href="/explore" onClick={() => setMobileMenuOpen(false)}>
                                    <Image src='/edu_ex.png' width={120} height={36} alt="EduBreezy" priority className="brightness-0 invert" />
                                </Link>
                            </div>

                            {/* Mobile Search */}
                            <div className="px-6 pt-4">
                                <div className="relative">
                                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search schools..."
                                        className="w-full h-10 pl-10 pr-4 text-sm rounded-full bg-[#334155] border border-[#475569] text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                            </div>

                            {/* Navigation Links */}
                            <nav className="flex-1 py-4 overflow-y-auto">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center justify-between h-12 px-6 text-base font-medium text-gray-300 hover:text-white hover:bg-[#334155] transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {link.label}
                                        <ChevronRight className="h-4 w-4 text-gray-500" />
                                    </Link>
                                ))}
                            </nav>

                            {/* Bottom Section - Buttons */}
                            <div className="shrink-0 border-t border-[#334155] p-6 space-y-3">
                                {loading ? (
                                    <div className="h-12 bg-[#334155] animate-pulse rounded-lg" />
                                ) : user ? (
                                    <>
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={parentData?.profilePicture || user.user_metadata?.avatar_url} />
                                                <AvatarFallback className="bg-blue-500/20 text-blue-300 font-medium">
                                                    {(parentData?.name || user.email)?.charAt(0).toUpperCase() || 'P'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{parentData?.name || user.email?.split('@')[0]}</p>
                                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        {/* Buttons */}
                                        <Link href="/explore/profile" onClick={() => setMobileMenuOpen(false)} className="block">
                                            <Button variant="outline" className="w-full h-12 gap-2 text-sm border-[#475569] text-gray-300 hover:bg-[#334155] hover:text-white">
                                                <User className="h-4 w-4" />
                                                My Profile
                                            </Button>
                                        </Link>
                                        <Button
                                            className="w-full h-12 gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                                            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign Out
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Link href="/explore/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                                            <Button variant="outline" className="w-full h-12 gap-2 text-sm font-medium border-[#475569] text-gray-300 hover:bg-[#334155] hover:text-white">
                                                <LogIn className="h-4 w-4" />
                                                Parent Login
                                            </Button>
                                        </Link>
                                        <Link href="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                                            <Button className="w-full h-12 gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white">
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

