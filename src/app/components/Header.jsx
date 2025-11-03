"use client";

import { Button } from "@/components/ui/button"
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
            name: "About",
            type: "submenu",
            submenus: [
                {
                    category: "Company",
                    items: [
                        { name: "About Us", link: "/about", target: "_self", description: "Learn about our mission" },
                        { name: "Our Team", link: "/team", target: "_self", description: "Meet the people behind EduBreezy" },
                        { name: "Careers", link: "/careers", target: "_self", description: "Join our growing team" },
                        { name: "Press & Media", link: "/press", target: "_self", description: "Latest news and updates" }
                    ]
                },
                {
                    category: "Resources",
                    items: [
                        { name: "Blog", link: "/blog", target: "_self", description: "Educational insights" },
                        { name: "Case Studies", link: "/case-studies", target: "_self", description: "Success stories" },
                        { name: "Testimonials", link: "/testimonials", target: "_self", description: "What our clients say" }
                    ]
                }
            ]
        },
        {
            name: "Solutions",
            type: "submenu",
            submenus: [
                {
                    category: "By Institution",
                    items: [
                        { name: "K-12 Schools", link: "/solutions/k12", target: "_self", description: "Complete management for schools" },
                        { name: "Colleges & Universities", link: "/solutions/college", target: "_self", description: "Higher education solutions" },
                        { name: "Training Centers", link: "/solutions/training", target: "_self", description: "Professional training management" },
                        { name: "Online Learning", link: "/solutions/online", target: "_self", description: "Virtual education platform" }
                    ]
                },
                {
                    category: "By Feature",
                    items: [
                        { name: "Student Management", link: "/features/students", target: "_self", description: "Track student progress" },
                        { name: "Attendance System", link: "/features/attendance", target: "_self", description: "Automated attendance" },
                        { name: "Fee Management", link: "/features/fees", target: "_self", description: "Streamlined payments" },
                        { name: "Grade Management", link: "/features/grades", target: "_self", description: "Digital grade books" }
                    ]
                }
            ]
        },
        {
            name: "Apps",
            type: "submenu",
            submenus: [
                {
                    category: "Mobile Apps",
                    items: [
                        { name: "Parent App", link: "/apps/parent", target: "_self", description: "Stay connected with your child's education" },
                        { name: "Teacher App", link: "/apps/teacher", target: "_self", description: "Manage classes on the go" },
                        { name: "Student App", link: "/apps/student", target: "_self", description: "Access learning materials anytime" }
                    ]
                },
                {
                    category: "Integrations",
                    items: [
                        { name: "Google Workspace", link: "/integrations/google", target: "_self", description: "Seamless Google integration" },
                        { name: "Microsoft 365", link: "/integrations/microsoft", target: "_self", description: "Connect with Microsoft tools" },
                        { name: "Zoom", link: "/integrations/zoom", target: "_self", description: "Virtual classroom integration" },
                        { name: "API Access", link: "/integrations/api", target: "_self", description: "Build custom integrations" }
                    ]
                }
            ]
        },
        {
            name: "Resources",
            type: "submenu",
            submenus: [
                {
                    category: "Learn",
                    items: [
                        { name: "Documentation", link: "/docs", target: "_self", description: "Complete guides and tutorials" },
                        { name: "Video Tutorials", link: "/tutorials", target: "_self", description: "Step-by-step video guides" },
                        { name: "Webinars", link: "/webinars", target: "_self", description: "Live training sessions" },
                        { name: "FAQ", link: "/faq", target: "_self", description: "Frequently asked questions" }
                    ]
                },
                {
                    category: "Support",
                    items: [
                        { name: "Help Center", link: "/help", target: "_self", description: "Get instant answers" },
                        { name: "Contact Support", link: "/support", target: "_self", description: "Reach our support team" },
                        { name: "Community Forum", link: "/community", target: "_self", description: "Connect with other users" },
                        { name: "System Status", link: "/status", target: "_blank", description: "Check system health" }
                    ]
                }
            ]
        }
    ]
};

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [AlreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const pathname = usePathname();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setAlreadyLoggedIn(true);
            }
        })
    }, [])

    const handleMouseEnter = (menuName) => {
        setActiveSubmenu(menuName);
    };

    const handleMouseLeave = () => {
        setActiveSubmenu(null);
    };

    const handleMenuClick = (menuName) => {
        setActiveSubmenu(activeSubmenu === menuName ? null : menuName);
    };

    const handleCloseMenu = () => {
        setActiveSubmenu(null);
    };

    return (
        <div className="fixed w-full border-b-black bg-white left-0 right-0 top-0 z-50 border-b border-gray-200">
            <nav className="px-6 lg:px-16 py-1">
                <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4">
                    {/* Logo - Left side */}
                    <div className="flex items-center gap-2">
                        <Link href="/" className="text-primary hover:text-primary/90">
                            <Image src='/edu.png' width={200} height={200} alt="EduBreezy" priority />
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
                                        className="text-gray-700 hover:text-[#026df3] transition-colors font-medium"
                                    >
                                        {menu.name}
                                    </Link>
                                ) : (
                                    <>
                                        <button 
                                            className="text-gray-700 hover:text-[#026df3] transition-colors font-medium flex items-center"
                                        >
                                            {menu.name} 
                                            <ChevronDown 
                                                className={`ml-1 w-4 h-4 transition-transform duration-300 ${
                                                    activeSubmenu === menu.name ? 'rotate-180' : ''
                                                }`} 
                                            />
                                        </button>

                                        {/* Mega Menu Dropdown */}
                                        {activeSubmenu === menu.name && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-screen max-w-4xl">
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

                    {/* Right side - Login/Dashboard Button */}
                    <div className="items-center flex gap-2">
                        {AlreadyLoggedIn ? (
                            <Link href="/dashboard">
                                <Button
                                    size="lg"
                                    className="font-bold transition-all bg-primary rounded-full text-white hover:bg-transparent cursor-pointer border lg:py-6 border-black hover:text-black"
                                >
                                    <span className="lg:text-lg">Go To Dashboard</span>
                                </Button>
                            </Link>
                        ) : (
                            pathname !== "/schoollogin" && (
                                <Link href="/schoollogin">
                                    <Button
                                        size="lg"
                                        className="font-bold lg:py-6 transition-all bg-primary rounded-full text-white hover:bg-transparent cursor-pointer border border-black hover:text-black"
                                    >
                                        <span className="lg:text-lg">Login</span>
                                    </Button>
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </nav>

            {/* Backdrop overlay when menu is open */}
            {activeSubmenu && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                    onMouseEnter={handleMouseLeave}
                ></div>
            )}
        </div>
    );
}