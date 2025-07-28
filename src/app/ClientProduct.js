"use client";

import { usePathname } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function ClientProduct({ children }) {
    const pathname = usePathname();
    const hideHeaderFooter = pathname.startsWith("/dashboard") || pathname === "/login";

    return (
        <>
            {!hideHeaderFooter && <Header />}
            <main className="flex-1 px-3.5 pt-4">{children}</main>
            {!hideHeaderFooter && <Footer />}
        </>
    );
}
