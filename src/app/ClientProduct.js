"use client";

import { usePathname } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CalBtn from "./components/cal";
import { useEffect, useState } from "react";

export default function ClientProduct({ children }) {
    const pathname = usePathname()

    const [hostname, setHostname] = useState("")

    useEffect(() => {
        if (typeof window !== "undefined") {
            setHostname(window.location.hostname)
        }
    }, [])

    const isSchoolDomain = hostname.startsWith("school.")

    const hideHeader =
        pathname.startsWith("/dashboard") ||
        pathname === "/login" ||
        pathname.startsWith("/exam") ||
        pathname.startsWith("/forms") ||
        (isSchoolDomain || pathname.startsWith("/explore"))

    const hidefooter =
        pathname.startsWith("/dashboard") ||
        pathname === "/login" ||
        pathname.startsWith("/exam") ||
        pathname.startsWith("/forms")




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
