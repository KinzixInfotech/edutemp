'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { SettingsDialogProvider } from '@/context/Settingsdialog-context'
import { LoaderProvider } from './context/Loader'
import { ThemeProvider } from '@/components/theme-provider'
import ClientLayout from '@/components/layout/client-layout'
import { Toaster } from '@/components/ui/sonner'
import { SettingsDialog } from '@/components/sidebar-dialog'

export default function ClientProviders({ children }) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SettingsDialogProvider>
                    <LoaderProvider>
                        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                            <ClientLayout>{children}</ClientLayout>
                            <Toaster
                                theme="system"
                                toastOptions={{
                                    classNames: { description: 'text-black dark:text-white' },
                                }}
                            />
                        </ThemeProvider>
                    </LoaderProvider>
                    <SettingsDialog />
                </SettingsDialogProvider>
            </AuthProvider>
        </QueryClientProvider>
    )
}
