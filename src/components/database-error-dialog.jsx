"use client"

import {
    AlertDialog,
    AlertDialogContent,
} from "@/components/ui/alert-dialog"
import { RefreshCw, Database, WifiOff, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function DatabaseErrorDialog({ open, onRetry }) {
    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl bg-transparent shadow-black/20">

                {/* Main Card Container */}
                <div className="bg-background rounded-xl border border-border shadow-xl overflow-hidden relative">

                    {/* Top Decoration Bar */}
                    <div className="h-2 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-600" />

                    <div className="p-8 flex flex-col items-center text-center relative z-10">

                        {/* Icon Container with Pulse Effect */}
                        <div className="relative mb-6 group">
                            <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                            <div className="relative h-20 w-20 bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-red-950 dark:via-background dark:to-red-900 rounded-full flex items-center justify-center border-4 border-white dark:border-red-950/50 shadow-inner">
                                <Database className="h-10 w-10 text-red-600 dark:text-red-500" />

                                {/* Status Indicator Badge */}
                                <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-background rounded-full flex items-center justify-center border-2 border-red-100 dark:border-red-900">
                                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="space-y-3 mb-8">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                Connection Lost
                            </h2>
                            <p className="text-muted-foreground text-[15px] leading-relaxed max-w-sm mx-auto">
                                We can't reach the database server right now.
                                This might be due to high traffic or maintenance.
                            </p>
                            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold py-1.5 px-3 rounded-full inline-block">
                                Error Code: 500 (Database Unreachable)
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="w-full space-y-3">
                            <Button
                                size="lg"
                                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/25 border-0 transition-all active:scale-[0.98]"
                                onClick={() => onRetry ? onRetry() : window.location.reload()}
                            >
                                <RefreshCw className="h-4 w-4 mr-2 animate-[spin_3s_linear_infinite]" />
                                Retry Connection
                            </Button>
                            <p className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-widest pt-2">
                                System Locked for Safety
                            </p>
                        </div>
                    </div>

                    {/* Background Texture/Noise (Optional) */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-20 filter contrast-150 brightness-100 mix-blend-overlay"></div>
                </div>

            </AlertDialogContent>
        </AlertDialog>
    )
}
