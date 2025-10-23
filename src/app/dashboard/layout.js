import './dashboard.css';
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import ClientLayout from "@/components/layout/client-layout"; // <- New
import { Toaster } from "@/components/ui/sonner"
// import { SettingsDialog } from "@/components/sidebar-dialog";
import { SettingsDialogProvider } from "@/context/Settingsdialog-context";
import { LoaderProvider } from './context/Loader';
import { Profile } from '@/components/profile';

import { CommandMenuProvider } from '@/components/CommandMenuContext';
import CommandMenu from '@/components/commandmenu';
export default async function RootLayout({ children }) {

    return (
        <AuthProvider>
            <SettingsDialogProvider>
                <CommandMenuProvider>
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
                            <CommandMenu />
                        </ThemeProvider>
                    </LoaderProvider>
                </CommandMenuProvider>
                {/* <SettingsDialog /> */}
                <Profile />
            </SettingsDialogProvider>
        </AuthProvider>
    );
}
