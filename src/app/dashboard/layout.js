import './dashboard.css';
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import ClientLayout from "@/components/layout/client-layout"; // <- New
import { Toaster } from "@/components/ui/sonner"
// import { SettingsDialog } from "@/components/sidebar-dialog";
import { SettingsDialogProvider } from "@/context/Settingsdialog-context";
import { LoaderProvider } from './context/Loader';
import { Profile } from '@/components/profile';
export default async function RootLayout({ children }) {

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
                {/* <SettingsDialog /> */}
                <Profile />
            </SettingsDialogProvider>
        </AuthProvider>
    );
}
