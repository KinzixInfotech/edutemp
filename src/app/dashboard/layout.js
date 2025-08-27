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
import { LoaderProvider } from './context/Loader';
export default async function RootLayout({ children }) {

    const cookieStore = cookies();
    const sbUser = cookieStore.get("sb-user");

    return (

        <AuthProvider>
            <SettingsDialogProvider>
                <LoaderProvider>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem >
                        <ClientLayout>{children}</ClientLayout>
                        <Toaster
                            theme="system"
                            toastOptions={{
                                classNames: {
                                    description: "text-black dark:text-white"
                                }
                            }}
                        />
                    </ThemeProvider>
                </LoaderProvider>
                <SettingsDialog />
            </SettingsDialogProvider>
        </AuthProvider>
    );
}
