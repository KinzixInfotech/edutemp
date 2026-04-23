"use client";

import { usePathname } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { useState } from "react";

export default function ClientProduct({ children }) {
    const pathname = usePathname()

    const [hostname] = useState(() => (typeof window !== "undefined" ? window.location.hostname : ""))

    const isAtlasDomain = hostname.startsWith("atlas.")
    const isPayDomain = hostname.startsWith("pay.")
    const isTeacherDomain = hostname.startsWith("teacher.")

    const hideHeader =
        pathname.startsWith("/dashboard") ||
        pathname === "/login" ||
        pathname.startsWith("/exam") ||
        pathname.startsWith("/forms") ||
        (isAtlasDomain || pathname.startsWith("/explore")) ||
        (isPayDomain || pathname.startsWith("/pay")) ||
        (isTeacherDomain || pathname.startsWith("/teacher"))


    const hidefooter =
        pathname.startsWith("/dashboard") ||
        pathname === "/login" ||
        pathname.startsWith("/exam") ||
        pathname.startsWith("/forms") ||
        (isPayDomain || pathname.startsWith("/pay")) ||
        (isAtlasDomain || pathname.startsWith("/atlas")) ||
        (isTeacherDomain || pathname.startsWith("/teacher"))





    return (
        <>
            {!hideHeader && <Header />}
            {/* px-3.5 pt-4 */}
            <main className="flex-1">{children}</main>
            {!hidefooter && <Footer />}
            {/* <div className="cal-hide-mobile">
                <CalBtn />
            </div> */}

        </>
    );
}
