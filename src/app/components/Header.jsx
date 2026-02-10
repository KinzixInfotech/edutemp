"use client";

import { Button } from "@/components/ui/button"
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, X, ArrowRight } from 'lucide-react';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import { triggerPageTransition } from "@/components/PageTransitionLoader";
// Menu Configuration - Easy to modify
const menuConfig = {
    menus: [
        {
            name: "Home",
            type: "link",
            link: "/",
            target: "_self"
        },
        {
            name: "Features",
            type: "link",
            link: "/features",
            target: "_self"
        },
        {
            name: "About",
            type: "link",
            link: "/about",
            target: "_self"
        },
        {
            name: "Grow With Us",
            type: "link",
            link: "/partners",
            target: "_self"
        },
        {
            name: "Contact",
            type: "link",
            link: "/contact",
            target: "_self"
        },
    ]
};

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [AlreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [mobileExpandedMenu, setMobileExpandedMenu] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setAlreadyLoggedIn(true);
            }
        })
    }, [])

    // Scroll detection for homepage
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleMouseEnter = (menuName) => {
        setActiveSubmenu(menuName);
    };

    const handleMouseLeave = () => {
        setActiveSubmenu(null);
    };

    const toggleMobileSubmenu = (menuName) => {
        setMobileExpandedMenu(mobileExpandedMenu === menuName ? null : menuName);
    };

    // Handle navigation with page transition
    const handleNavClick = (e, link) => {
        // Only trigger transition if navigating to a different page
        if (link !== pathname) {
            e.preventDefault();
            triggerPageTransition();
            setTimeout(() => {
                router.push(link);
            }, 100);
        }
    };

    // Check if we're on the homepage
    const isHomePage = pathname === '/';

    // Dynamic classes for header
    const headerClasses = 'fixed w-full left-0 right-0 top-0 z-[100] transition-all duration-300 bg-[#ffffffdb] backdrop-blur-md border-b border-gray-200';

    return (
        <div className={headerClasses}>
            <nav className="px-4 lg:px-16 py-1">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4">
                    {/* Logo - Left side */}
                    <div className="flex items-center gap-2 flex-row justify-center shrink-0">
                        <Link href="/" className="text-primary hover:text-primary/90">
                            <Image src='/edu.png' width={150} height={150} alt="EduBreezy" priority className="w-[120px] md:w-[200px]" />
                        </Link>
                    </div>

                    {/* Desktop Navigation - Middle */}
                    <div className="hidden lg:flex items-center gap-6">
                        {menuConfig.menus.map((menu, index) => (
                            <div
                                key={index}
                                className="relative"
                                onMouseEnter={() => menu.type === 'submenu' && handleMouseEnter(menu.name)}
                                onMouseLeave={handleMouseLeave}
                            >
                                {menu.type === 'link' ? (
                                    <Link
                                        href={menu.link}
                                        target={menu.target}
                                        className="text-gray-700 hover:text-[#026df3] transition-colors font-medium py-4"
                                        onClick={(e) => handleNavClick(e, menu.link)}
                                    >
                                        {menu.name}
                                    </Link>
                                ) : (
                                    <>
                                        <button
                                            className="text-gray-700 hover:text-[#026df3] transition-colors font-medium flex items-center py-4"
                                        >
                                            {menu.name}
                                            <ChevronDown
                                                className={`ml-1 w-4 h-4 transition-transform duration-300 ${activeSubmenu === menu.name ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {/* Mega Menu Dropdown */}
                                        {activeSubmenu === menu.name && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-screen max-w-4xl">
                                                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                                    <div className="grid grid-cols-2 gap-8">
                                                        {menu.submenus.map((submenu, subIndex) => (
                                                            <div key={subIndex} className="space-y-4">
                                                                <h3 className="text-sm font-bold text-[#026df3] uppercase tracking-wide mb-4">
                                                                    {submenu.category}
                                                                </h3>
                                                                <div className="space-y-2">
                                                                    {submenu.items.map((item, itemIndex) => (
                                                                        <Link
                                                                            key={itemIndex}
                                                                            href={item.link}
                                                                            target={item.target}
                                                                            className="block group p-3 rounded-lg hover:bg-[#026df3]/5 transition-all duration-200"
                                                                            onClick={() => setActiveSubmenu(null)}
                                                                        >
                                                                            <div className="font-semibold text-gray-900 group-hover:text-[#026df3] transition-colors mb-1">
                                                                                {item.name}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500 group-hover:text-gray-700">
                                                                                {item.description}
                                                                            </div>
                                                                        </Link>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Right side - Login/Dashboard Button + Mobile Menu */}
                    <div className="items-center flex gap-2 shrink-0">
                        {/* Desktop Login/Dashboard Button */}
                        <div className="hidden lg:flex">
                            {AlreadyLoggedIn ? (
                                <Link href="/dashboard">
                                    <button className="group  border border-black  flex items-center pr-1.5 gap-2 bg-[#0569ff] text-white border-0 rounded-full text-[0.95rem] font-semibold cursor-pointer transition-all duration-300 hover:bg-[#0450d4]">
                                        <span className='px-1 pl-6 py-3'>Go To Dashboard</span>
                                        <span className='bg-white p-2.5 rounded-full group-hover:bg-gray-50 transition-colors'>
                                            <ArrowRight size={18} strokeWidth={3} color='#0569ff' className='transition-transform duration-300 group-hover:-rotate-45' />
                                        </span>
                                    </button>
                                </Link>
                            ) : (
                                pathname !== "/schoollogin" && (
                                    <Link href="/schoollogin">
                                        <button className="group border border-black flex items-center pr-1.5 gap-2 bg-[#0569ff] text-white border-0 rounded-full text-[0.95rem] font-semibold cursor-pointer transition-all duration-300 hover:bg-[#0450d4]">
                                            <span className='px-1 pl-6 py-3'>Login</span>
                                            <span className='bg-white p-2.5 rounded-full group-hover:bg-gray-50 transition-colors'>
                                                <ArrowRight size={18} strokeWidth={3} color='#0569ff' className='transition-transform duration-300 group-hover:-rotate-45' />
                                            </span>
                                        </button>
                                    </Link>
                                )
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild className="lg:hidden">
                                <Button variant="ghost" size="icon" className="h-10 w-10">
                                    <HiOutlineMenuAlt3 strokeWidth={3} size={30} />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
                                {/* Header */}
                                <div className="flex items-center h-16 px-6 border-b shrink-0">
                                    <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                                        <Image src='/edu.png' width={120} height={36} alt="EduBreezy" priority />
                                    </Link>
                                </div>

                                {/* Navigation Links */}
                                <nav className="flex-1 py-4 overflow-y-auto">
                                    {menuConfig.menus.map((menu, index) => (
                                        <div key={index}>
                                            {menu.type === 'link' ? (
                                                <Link
                                                    href={menu.link}
                                                    className="flex items-center justify-between h-12 px-6 text-base font-medium border-b text-foreground/80 hover:text-primary hover:bg-muted/50 transition-colors"
                                                    onClick={(e) => {
                                                        setMobileMenuOpen(false);
                                                        handleNavClick(e, menu.link);
                                                    }}
                                                >
                                                    {menu.name}
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                                </Link>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => toggleMobileSubmenu(menu.name)}
                                                        className="flex items-center justify-between w-full h-12 px-6 text-base font-medium border-b text-foreground/80 hover:text-primary hover:bg-muted/50 transition-colors"
                                                    >
                                                        {menu.name}
                                                        <ChevronDown className={`h-4 w-4 text-muted-foreground/50 transition-transform duration-200 ${mobileExpandedMenu === menu.name ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {mobileExpandedMenu === menu.name && (
                                                        <div className="bg-muted/30 py-2">
                                                            {menu.submenus.map((submenu, subIndex) => (
                                                                <div key={subIndex} className="px-6 py-2">
                                                                    <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">
                                                                        {submenu.category}
                                                                    </p>
                                                                    {submenu.items.map((item, itemIndex) => (
                                                                        <Link
                                                                            key={itemIndex}
                                                                            href={item.link}
                                                                            className="block py-2 pl-3 text-sm text-foreground/70 hover:text-primary transition-colors"
                                                                            onClick={() => setMobileMenuOpen(false)}
                                                                        >
                                                                            {item.name}
                                                                        </Link>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </nav>

                                {/* Bottom Section - Buttons */}
                                <div className="shrink-0 border-t border-gray-100 p-6 space-y-3 bg-gray-50/50">
                                    {AlreadyLoggedIn ? (
                                        <Link href="/dashboard" className="block" onClick={() => setMobileMenuOpen(false)}>
                                            <button className="group w-full flex items-center justify-center pr-1 gap-2 bg-[#0569ff] text-white rounded-full text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-[#0450d4]">
                                                <span className='px-1 pl-5 py-2.5'>Go To Dashboard</span>
                                                <span className='bg-white p-1.5 rounded-full group-hover:bg-gray-50 transition-colors'>
                                                    <ArrowRight size={14} strokeWidth={3} color='#0569ff' className='transition-transform duration-300 group-hover:-rotate-45' />
                                                </span>
                                            </button>
                                        </Link>
                                    ) : (
                                        <Link href="/schoollogin" className="block" onClick={() => setMobileMenuOpen(false)}>
                                            <button className="group w-full flex items-center justify-center pr-1 gap-2 bg-[#0569ff] text-white rounded-full text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-[#0450d4]">
                                                <span className='px-1 pl-5 py-2.5'>Login</span>
                                                <span className='bg-white p-1.5 rounded-full group-hover:bg-gray-50 transition-colors'>
                                                    <ArrowRight size={14} strokeWidth={3} color='#0569ff' className='transition-transform duration-300 group-hover:-rotate-45' />
                                                </span>
                                            </button>
                                        </Link>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </nav>

            {/* Backdrop overlay when menu is open (Desktop only) */}
            {activeSubmenu && (
                <div
                    className="hidden lg:block fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                    onMouseEnter={handleMouseLeave}
                ></div>
            )}
        </div>
    );
}