import './dashboard.css';
import { AuthProvider } from "@/context/AuthContext";
import { LibraryNotificationProvider } from "@/context/LibraryNotificationContext";
import { AttendanceReminderProvider } from "@/context/AttendanceReminderContext";
import { ThemeProvider } from "@/components/theme-provider";
import ClientLayout from "@/components/layout/client-layout"; // <- New
import { Toaster } from "@/components/ui/sonner"
// import { SettingsDialog } from "@/components/sidebar-dialog";
import { SettingsDialogProvider } from "@/context/Settingsdialog-context";
import { LoaderProvider } from './context/Loader';
import { Profile } from '@/components/profile';

import { CommandMenuProvider } from '@/components/CommandMenuContext';

import { SecurityAlertBanner } from '@/components/security-alert-banner';
export default async function RootLayout({ children }) {

    return (
        <AuthProvider>
            <LibraryNotificationProvider>
                <AttendanceReminderProvider>
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
                                    <SecurityAlertBanner />
                                    {/* CommandMenu is rendered inside CommandMenuProvider */}
                                </ThemeProvider>
                            </LoaderProvider>
                        </CommandMenuProvider>
                        {/* <SettingsDialog /> */}
                        <Profile />
                    </SettingsDialogProvider>
                </AttendanceReminderProvider>
            </LibraryNotificationProvider>
        </AuthProvider>
    );
}
