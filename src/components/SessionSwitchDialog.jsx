'use client';

import { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Calendar, Clock, Database, FileText, IndianRupee } from 'lucide-react';

const STORAGE_KEY = 'hideSessionSwitchWarning';

export function SessionSwitchDialog({ isOpen, onClose, onConfirm, fromSession, toSession, toSessionData }) {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleConfirm = () => {
        if (dontShowAgain) {
            localStorage.setItem(STORAGE_KEY, 'true');
        }
        onConfirm();
    };

    // Check if the target year hasn't started yet
    const isPreStart = toSessionData?.startDate && new Date(toSessionData.startDate) > new Date();
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isPreStart ? "bg-blue-500/10" : "bg-amber-500/10"
                            }`}>
                            {isPreStart ? (
                                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                            ) : (
                                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                            )}
                        </div>
                        <div>
                            <AlertDialogTitle className="text-xl">Switch Academic Session?</AlertDialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {fromSession} → {toSession}
                            </p>
                        </div>
                    </div>
                </AlertDialogHeader>

                <AlertDialogDescription asChild>
                    <div className="space-y-4 py-4">
                        {/* Pre-start warning */}
                        {isPreStart && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    <span className="font-semibold">⏳ Note:</span> This academic year hasn't started yet. It will officially begin on <strong>{formatDate(toSessionData.startDate)}</strong>.
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                    You'll be in <strong>configuration mode</strong> — attendance and some operational features will be restricted until the start date.
                                </p>
                            </div>
                        )}

                        <p className="text-sm text-foreground">
                            Switching academic sessions will reload all data from the selected session. This affects:
                        </p>

                        <div className="space-y-3 pl-1">
                            <div className="flex items-start gap-3">
                                <Database className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Student & Staff Data</p>
                                    <p className="text-xs text-muted-foreground">View students enrolled in this session</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Attendance & Calendar</p>
                                    <p className="text-xs text-muted-foreground">Session-specific attendance records</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <IndianRupee className="h-4 w-4 mt-0.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Fee Collection</p>
                                    <p className="text-xs text-muted-foreground">Payments and dues for this session</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <FileText className="h-4 w-4 mt-0.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Exams & Reports</p>
                                    <p className="text-xs text-muted-foreground">All academic records and results</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-xs text-red-700 dark:text-red-400">
                                <span className="font-semibold">⚠️ Important:</span> If switching to a new academic year, you will need to complete the setup process including student promotion, fee configuration, and class/subject mapping. The previous year will become read-only.
                            </p>
                        </div>

                        <div className="bg-muted/50 border border-border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Note:</span> The page will reload automatically after switching sessions.
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="dont-show"
                                checked={dontShowAgain}
                                onCheckedChange={setDontShowAgain}
                            />
                            <Label
                                htmlFor="dont-show"
                                className="text-sm font-normal cursor-pointer select-none"
                            >
                                Don't show this warning again
                            </Label>
                        </div>
                    </div>
                </AlertDialogDescription>

                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {isPreStart ? "Switch to Configuration Mode" : "Switch Session"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// Helper function to check if warning should be shown
export function shouldShowSessionWarning() {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) !== 'true';
}

// Helper function to reset the warning preference
export function resetSessionWarningPreference() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
}
