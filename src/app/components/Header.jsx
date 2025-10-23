"use client";

import { Button } from "@/components/ui/button"
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from "next/navigation";

import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu"

const navigationLinks = [
    // { href: "#", label: "Home", active: true },
    // { href: "#", label: "Features" },
]

export default function Header() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 border-b bg-white px-4 md:px-6 py-1 border-b-black z-50">
            <div className="flex h-16 items-center justify-between gap-4">
                {/* Left side */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-primary hover:text-primary/90">
                            <Image src='/edu.png' width={200} height={200} alt="EduBreezy" priority />
                        </Link>
                    </div>
                </div>

                {/* Middle Nav */}
                <div>
                    <NavigationMenu className="max-md:hidden">
                        <NavigationMenuList className="gap-2">
                            {navigationLinks.map((link, index) => (
                                <NavigationMenuItem key={index}>
                                    <NavigationMenuLink
                                        active={link.active}
                                        href={link.href}
                                        className="text-muted-foreground hover:text-primary py-1.5 font-medium">
                                        {link.label}
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>

                {/* Right side (Login button) */}
                <div className="flex items-center gap-2">
                    {pathname !== "/schoollogin" && (
                        <Link href={'/schoollogin'}>
                            <Button
                                asChild
                                size="lg"
                                className="text-sm transition-all bg-primary rounded-full font-bold w-[100px] text-white hover:bg-transparent cursor-pointer border border-black hover:text-black"
                            >
                                <span>Login</span>
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
