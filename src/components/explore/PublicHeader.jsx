'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { School, Menu, LogIn, LogOut, User, ChevronRight, ArrowRight } from 'lucide-react';
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

            const { data: { session } } = await supabase.auth.getSession();
            handleAuthChange(session);

            const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event, session) => {
                handleAuthChange(session);
            });
            subscription = sub;
        };

        initAuth();
        return () => { subscription?.unsubscribe(); };
    }, []);

    const handleAuthChange = (session) => {
        setUser(session?.user || null);
        if (session?.user && typeof window !== 'undefined') {
            const storedData = localStorage.getItem('parentUser');
            if (storedData) setParentData(JSON.parse(storedData));
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
            if (typeof window !== 'undefined') localStorage.removeItem('parentUser');
            window.location.href = '/explore';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const navLinks = [
        { href: '/explore', label: 'Home' },
        { href: '/explore/schools', label: 'Schools' },
        { href: '/explore/compare', label: 'Compare' },
        { href: '/explore/about', label: 'About' },
    ];

    return (
        <div className="fixed w-full left-0 right-0 top-0 z-[100] transition-all duration-300 bg-[#fffffff0] backdrop-blur-md border-b border-gray-200">
            <nav className="px-4 lg:px-16 py-1">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Link href="/explore" className="text-primary hover:text-primary/90">
                            <Image src="/atlas.png" width={150} height={150} alt="EduBreezy Atlas" priority className="w-[120px] md:w-[160px]" />
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-gray-700 hover:text-[#0052ff] transition-colors font-medium py-4"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right: Search + Auth + Mobile */}
                    <div className="items-center flex gap-2 shrink-0">
                        {/* Desktop Search + Auth */}
                        <div className="hidden lg:flex items-center gap-4">


                            {/* Auth */}
                            {loading ? (
                                <div className="h-10 w-32 animate-pulse bg-slate-100 rounded-lg" />
                            ) : user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="gap-2 text-slate-700 hover:bg-slate-100">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={parentData?.profilePicture || user.user_metadata?.avatar_url} />
                                                <AvatarFallback className="bg-blue-100 text-[#0052ff] font-semibold">
                                                    {(parentData?.name || user.email)?.charAt(0).toUpperCase() || 'P'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="hidden xl:inline text-sm">{parentData?.name || user.email?.split('@')[0]}</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuLabel>
                                            <div className="space-y-1">
                                                <p className="font-medium">{parentData?.name || 'Parent'}</p>
                                                {parentData?.parent?.school && (
                                                    <p className="text-xs text-muted-foreground">{parentData.parent.school.name}</p>
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
                                <div className="flex items-center gap-2.5">
                                    <Link href="/explore/login">
                                        <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                                            <LogIn className="h-4 w-4" />
                                            Log In
                                        </Button>
                                    </Link>
                                    <Link href="/login">
                                        <button className="group flex items-center pr-1.5 gap-2 bg-[#0052ff] text-white rounded-full text-[0.85rem] font-semibold cursor-pointer transition-all duration-300 hover:bg-[#0450b4]">
                                            <span className="px-1 pl-5 py-2.5 flex items-center gap-1.5">
                                                <School className="h-4 w-4" />
                                                School Login
                                            </span>
                                            <span className="bg-white p-2 rounded-full group-hover:bg-gray-50 transition-colors">
                                                <ArrowRight size={14} strokeWidth={3} color="#0052ff" className="transition-transform duration-300 group-hover:-rotate-45" />
                                            </span>
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu */}
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild className="lg:hidden">
                                <Button variant="ghost" size="icon" className="h-10 w-10">
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
                                {/* Header */}
                                <div className="flex items-center h-16 px-6 border-b shrink-0">
                                    <Link href="/explore" onClick={() => setMobileMenuOpen(false)}>
                                        <Image src="/atlas.png" width={150} height={150} alt="EduBreezy Atlas" priority />
                                    </Link>
                                </div>


                                {/* Navigation Links */}
                                <nav className="flex-1 py-4 overflow-y-auto">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className="flex items-center justify-between h-12 px-6 text-base font-medium border-b text-foreground/80 hover:text-[#0052ff] hover:bg-muted/50 transition-colors"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            {link.label}
                                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                        </Link>
                                    ))}
                                </nav>

                                {/* Bottom Section */}
                                <div className="shrink-0 border-t border-gray-100 p-6 space-y-3 bg-gray-50/50">
                                    {loading ? (
                                        <div className="h-12 bg-gray-200 animate-pulse rounded-lg" />
                                    ) : user ? (
                                        <>
                                            {/* User Info */}
                                            <div className="flex items-center gap-3 mb-4">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={parentData?.profilePicture || user.user_metadata?.avatar_url} />
                                                    <AvatarFallback className="bg-blue-100 text-[#0052ff] font-medium">
                                                        {(parentData?.name || user.email)?.charAt(0).toUpperCase() || 'P'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{parentData?.name || user.email?.split('@')[0]}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                            <Link href="/explore/profile" onClick={() => setMobileMenuOpen(false)} className="block">
                                                <Button variant="outline" className="w-full h-12 gap-2 text-sm">
                                                    <User className="h-4 w-4" />
                                                    My Profile
                                                </Button>
                                            </Link>
                                            <button
                                                className="group w-full flex items-center justify-center pr-1 gap-2 bg-[#0566c7] text-white rounded-full text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-[#0450b4]"
                                                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                                            >
                                                <span className="px-1 pl-5 py-2.5 flex items-center gap-1.5">
                                                    <LogOut className="h-4 w-4" />
                                                    Sign Out
                                                </span>
                                                <span className="bg-white p-1.5 rounded-full group-hover:bg-gray-50 transition-colors">
                                                    <ArrowRight size={14} strokeWidth={3} color="#0566c7" className="transition-transform duration-300 group-hover:-rotate-45" />
                                                </span>
                                            </button>
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
                                                <button className="group w-full flex items-center justify-center pr-1 gap-2 bg-[#0566c7] text-white rounded-full text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-[#0450b4]">
                                                    <span className="px-1 pl-5 py-2.5 flex items-center gap-1.5">
                                                        <School className="h-4 w-4" />
                                                        School Login
                                                    </span>
                                                    <span className="bg-white p-1.5 rounded-full group-hover:bg-gray-50 transition-colors">
                                                        <ArrowRight size={14} strokeWidth={3} color="#0566c7" className="transition-transform duration-300 group-hover:-rotate-45" />
                                                    </span>
                                                </button>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </nav>
        </div>
    );
}
