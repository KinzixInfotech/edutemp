// import "./globals.css";
import './dashboard.css';
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import ClientLayout from "@/components/layout/client-layout"; // <- New
import { Toaster } from "@/components/ui/sonner"
import { SettingsDialog } from "@/components/sidebar-dialog";
import { SettingsDialogProvider } from "@/context/Settingsdialog-context";
import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { cookies } from "next/headers";
export default async function RootLayout({ children }) {
    const cookieStore = cookies();
    const sbUser = cookieStore.get("sb-user");
    if (!sbUser) {
        // redirect or handle unauthenticated
        redirect('/login');
    } else {
        console.log("🍪 User from cookie:", sbUser.value);
    }
    // const currentUser = session?.user ?? null;
    // console.log("📦 Initial Session: from", session);
    // if (!user) {
    //     redirect('/login')
    // }
    return (

        <AuthProvider>
            <SettingsDialogProvider>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem >
                    <ClientLayout>{children}</ClientLayout>
                    <Toaster />
                </ThemeProvider>
                <SettingsDialog />
            </SettingsDialogProvider>
        </AuthProvider>
    );
}
