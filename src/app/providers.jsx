'use client';
export const dynamic = 'force-dynamic';


import { AuthProvider } from "@/context/AuthContext"

export function Providers({ children }) {
    return (
        <AuthProvider>
           {children}
        </AuthProvider>

    )
}
