// components/TopProgressBar.jsx
"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import NProgress from "nprogress"
import "nprogress/nprogress.css"

export default function TopProgressBar() {
    const pathname = usePathname()

    useEffect(() => {
        NProgress.configure({ showSpinner: false });
        NProgress.start()
        const timeout = setTimeout(() => {
            NProgress.done()
        }, 300) // adjust as needed

        return () => clearTimeout(timeout)
    }, [pathname])

    return null
}
