"use client";

import { Button } from "@/components/ui/button"
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from 'lucide-react';

import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { useState } from "react";

const navigationLinks = [
    // { href: "#", label: "Home", active: true },
    // { href: "#", label: "Features" },
]

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

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
                        <a href="#" className="text-gray-700 hover:text-[#0569ff] transition-colors font-medium">Home</a>
                        <div className="relative group">
                            <button className="text-gray-700 hover:text-[#0569ff] transition-colors font-medium flex items-center">
                                About <ChevronDown className="ml-1 w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative group">
                            <button className="text-gray-700 hover:text-[#0569ff] transition-colors font-medium flex items-center">
                                Solutions <ChevronDown className="ml-1 w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative group">
                            <button className="text-gray-700 hover:text-[#0569ff] transition-colors font-medium flex items-center">
                                Apps <ChevronDown className="ml-1 w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative group">
                            <button className="text-gray-700 hover:text-[#0569ff] transition-colors font-medium flex items-center">
                                Resources <ChevronDown className="ml-1 w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Right side - Request Demo Button */}
                    <div className="flex items-center gap-2">
                        {pathname !== "/schoollogin" && (
                            <Link href={'/schoollogin'}>
                                <Button
                                    // asChild
                                    size={'lg'}
                                    className="font-bold transition-all bg-primary rounded-full py-5  text-white hover:bg-transparent cursor-pointer border border-black hover:text-black"
                                >
                                    <span>Login</span>
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile Menu */}
                {/* {isMenuOpen || pathname !=='/schoollogin' && (
                    <div className="lg:hidden absolute top-full left-0 right-0 bg-white shadow-xl py-4 px-6 space-y-3 border-t">
                        <a href="#" className="block text-gray-700 hover:text-[#0569ff] transition-colors font-medium py-2">Home</a>
                        <a href="#" className="block text-gray-700 hover:text-[#0569ff] transition-colors font-medium py-2">About</a>
                        <a href="#" className="block text-gray-700 hover:text-[#0569ff] transition-colors font-medium py-2">Solutions</a>
                        <a href="#" className="block text-gray-700 hover:text-[#0569ff] transition-colors font-medium py-2">Apps</a>
                        <a href="#" className="block text-gray-700 hover:text-[#0569ff] transition-colors font-medium py-2">Resources</a>
                        <button className="w-full bg-red-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all duration-300 mt-2">
                            Request Free Demo
                        </button>
                    </div>
                )} */}
            </nav>
        </div>
    );
}