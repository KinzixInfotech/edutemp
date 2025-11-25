"use client";

import { usePathname } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CalBtn from "./components/cal";

export default function ClientProduct({ children }) {
    const pathname = usePathname();
    const hideheader = pathname.startsWith("/dashboard") || pathname === "/login" || pathname.startsWith("/exam");
    const hidefooter = pathname.startsWith("/dashboard") || pathname === "/login" || pathname.startsWith("/exam");


    return (
        <>
            {!hideheader && <Header />}
            {/* px-3.5 pt-4 */}
            <main className="flex-1">{children}</main>
            {!hidefooter && <Footer />}
            {/* <div className="cal-hide-mobile">
                <CalBtn />
            </div> */}

        </>
    );
}
