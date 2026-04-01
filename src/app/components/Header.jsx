"use client";

import { Button } from "@/components/ui/button"
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, X, ArrowRight, Phone, Mail, Twitter, Linkedin, Instagram, Facebook, Youtube } from 'lucide-react';
import { useEffect, useRef, useState } from "react";
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
            link: "/features/docs",
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

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 80);
        window.addEventListener('scroll', handleScroll, { passive: true });
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
    // Add ref to header
    const headerRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(100);

    useEffect(() => {
        const update = () => setHeaderHeight(headerRef.current?.offsetHeight ?? 100);
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update);
        };
    }, []);



    // Check if we're on the homepage
    const isHomePage = pathname === '/';

    // Dynamic classes for header
    const headerClasses = 'fixed w-full left-0 right-0 top-0 z-[100] bg-[#ffffffdb] backdrop-blur-md border-b border-gray-200 [padding-top:env(safe-area-inset-top)]';
    return (
        <>
            {/* Top Contact Bar */}
            <div className={headerClasses} ref={headerRef} style={{ transform: 'translateZ(0)', willChange: 'transform' }}>
                {/* Top Contact Bar */}
                <div className={`w-full bg-[#0f1623] text-white px-2 sm:px-4 lg:px-16 pb-2 pt-2 md:py-0 transition-all duration-300 ${isScrolled ? 'hidden md:block' : 'block'}`} style={{ lineHeight: '1' }}>
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 md:gap-2 lg:min-h-[44px] min-h-[20px] items-center justify-center md:justify-between">
                        {/* Left */}
                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5">
                            <a href="tel:+919470556016" className="flex items-center gap-1.5 text-[#a0b4cc] hover:text-white transition-all text-[12.5px] no-underline leading-none">
                                <Phone size={13} strokeWidth={2} className="block shrink-0" />
                                <span className="mt-[1.5px] hover:text-white transition-all">+91 94705 56016</span>
                            </a>
                            <div className="hidden sm:block w-[1px] h-[12px] bg-[#2a3a4a]" />
                            <a href="mailto:hello@edubreezy.com" className="flex items-center gap-1.5 text-[#a0b4cc] hover:text-white transition-all text-[12.5px] no-underline leading-none">
                                <Mail size={13} strokeWidth={2} className="block shrink-0" />
                                <span className="mt-[1.5px] hover:text-white transition-all">hello@edubreezy.com</span>
                            </a>
                            <span style={{ fontSize: '11px', color: '#3af0a0', background: 'rgba(58,240,160,0.1)', border: '1px solid rgba(58,240,160,0.3)', borderRadius: '100px', padding: '3px 10px 1px 10px', fontWeight: 500, lineHeight: '1.5' }} className="relative overflow-hidden hidden md:inline-flex items-center justify-center">
                                <span className="relative z-10">Not Your Typical School ERP!</span>
                                <span className="absolute inset-0 flex" style={{ animation: 'shimmer-slide 6s infinite' }}>
                                    <span className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12" />
                                </span>
                                <style>{`
                                    @keyframes shimmer-slide {
                                        0% { transform: translateX(-150%); }
                                        50% { transform: translateX(200%); }
                                        100% { transform: translateX(200%); }
                                    }
                                `}</style>
                            </span>
                        </div>

                        {/* Right - Social Icons */}
                        <div className="lg:flex items-center justify-center gap-2 hidden ">
                            <a href="https://www.youtube.com/@edubreezy" target="_blank" rel="noopener noreferrer" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Youtube size={13} color="white" style={{ display: 'block' }} />
                            </a>
                            <a href="https://www.instagram.com/edubreezyindia/" target="_blank" rel="noopener noreferrer" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Instagram size={13} strokeWidth={2} style={{ display: 'block' }} />
                            </a>
                            {/* <a href="https://twitter.com/edubreezy" target="_blank" rel="noopener noreferrer" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Twitter size={13} fill="white" stroke="none" style={{ display: 'block' }} />
                            </a> */}
                            <a href="https://www.facebook.com/people/EduBreezy/61586992906345/" target="_blank" rel="noopener noreferrer" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Facebook size={13} fill="white" stroke="none" style={{ display: 'block' }} />
                            </a>
                            <a href="https://www.linkedin.com/company/edubreezy" target="_blank" rel="noopener noreferrer" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Linkedin size={13} fill="white" stroke="none" style={{ display: 'block' }} />
                            </a>

                        </div>

                    </div>
                </div>
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
                                <SheetContent
                                    side="right"
                                    className="w-[300px] sm:w-[340px] p-0 flex flex-col [padding-bottom:env(safe-area-inset-bottom)] z-[99]"
                                    style={{ top: `${headerHeight}px`, height: `calc(100dvh - ${headerHeight}px)` }}
                                >

                                    {/* Navigation Links */}
                                    <nav className="flex-1 pt-10 pb-4 overflow-y-auto">
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
                                    <div className="shrink-0 border-t border-gray-100 px-6 pt-5 pb-8 space-y-3 bg-gray-50/50">
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
                {
                    activeSubmenu && (
                        <div
                            className="hidden lg:block fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                            onMouseEnter={handleMouseLeave}
                        ></div>
                    )
                }
            </div >
        </>
    );
}