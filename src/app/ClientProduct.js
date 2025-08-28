"use client";

import { usePathname } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function ClientProduct({ children }) {
    const pathname = usePathname();
    const hideheader = pathname.startsWith("/dashboard") || pathname === "/login";
    const hidefooter = pathname.startsWith("/dashboard") || pathname === "/login";


    return (
        <>
            {!hideheader && <Header />}
            {/* px-3.5 pt-4 */}
            <main className="flex-1">{children}</main>
            {!hidefooter && <Footer />}
        </>
    );
}
