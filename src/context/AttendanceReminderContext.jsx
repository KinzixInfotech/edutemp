"use client";

// context/AttendanceReminderContext.jsx
// Optimized attendance reminder system for web dashboard
// Minimal API load - fetches settings once, calculates windows locally

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';

const AttendanceReminderContext = createContext();

// Reminder types
export const REMINDER_TYPES = {
    CHECK_IN_OPEN: 'CHECK_IN_OPEN',
    LATE_WARNING: 'LATE_WARNING',
    CHECK_IN_CLOSED: 'CHECK_IN_CLOSED',
    CHECK_OUT_OPEN: 'CHECK_OUT_OPEN',
    CHECK_OUT_WARNING: 'CHECK_OUT_WARNING',
};

// Local storage keys
const STORAGE_KEYS = {
    DISMISSED_TODAY: 'attendance_reminder_dismissed',
    SETTINGS_CACHE: 'attendance_settings_cache',
};

export function AttendanceReminderProvider({ children }) {
    const { fullUser } = useAuth();

    // State
    const [activeReminder, setActiveReminder] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [attendanceSettings, setAttendanceSettings] = useState(null);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Refs
    const timersRef = useRef([]);
    const hasScheduledToday = useRef(false);
    const hasFetched = useRef(false);

    // Check if user can mark attendance (admin, principal, director, teaching staff)
    const canMarkAttendance = ['ADMIN', 'PRINCIPAL', 'DIRECTOR', 'TEACHING_STAFF', 'NON_TEACHING_STAFF'].includes(fullUser?.role?.name);

    // Get today's date string
    const getTodayKey = () => new Date().toISOString().split('T')[0];

    // Check if reminder was dismissed today
    const isDismissedToday = (reminderType) => {
        try {
            const dismissed = localStorage.getItem(STORAGE_KEYS.DISMISSED_TODAY);
            if (dismissed) {
                const data = JSON.parse(dismissed);
                return data.date === getTodayKey() && data.types?.includes(reminderType);
            }
        } catch (e) {
            console.error('[AttendanceReminder] Error checking dismissed:', e);
        }
        return false;
    };

    // Mark reminder as dismissed for today
    const dismissReminderForToday = (reminderType) => {
        try {
            const dismissed = localStorage.getItem(STORAGE_KEYS.DISMISSED_TODAY);
            let data = { date: getTodayKey(), types: [] };

            if (dismissed) {
                const parsed = JSON.parse(dismissed);
                if (parsed.date === getTodayKey()) {
                    data = parsed;
                }
            }

            if (!data.types.includes(reminderType)) {
                data.types.push(reminderType);
            }

            localStorage.setItem(STORAGE_KEYS.DISMISSED_TODAY, JSON.stringify(data));
        } catch (e) {
            console.error('[AttendanceReminder] Error dismissing reminder:', e);
        }
    };

    // Dismiss current reminder
    const dismissReminder = useCallback((dontShowAgainToday = false) => {
        if (dontShowAgainToday && activeReminder) {
            dismissReminderForToday(activeReminder.type);
        }
        setIsDialogOpen(false);
        setActiveReminder(null);
    }, [activeReminder]);

    // Reminder configurations
    const REMINDER_CONFIG = {
        [REMINDER_TYPES.CHECK_IN_OPEN]: {
            emoji: '🕐',
            title: 'Check-In Time!',
            description: 'Attendance check-in is now open. Mark your attendance.',
            actionLabel: 'Mark Attendance',
            accentColor: 'bg-blue-500',
        },
        [REMINDER_TYPES.LATE_WARNING]: {
            emoji: '⚠️',
            title: 'Late Check-In Warning',
            description: 'Grace period has ended. Check in now to avoid being marked late!',
            actionLabel: 'Check In Now',
            accentColor: 'bg-amber-500',
        },
        [REMINDER_TYPES.CHECK_OUT_OPEN]: {
            emoji: '🏠',
            title: 'Check-Out Available',
            description: 'You can now check out. Don\'t forget to mark your exit!',
            actionLabel: 'Check Out',
            accentColor: 'bg-green-500',
        },
        [REMINDER_TYPES.CHECK_OUT_WARNING]: {
            emoji: '⏰',
            title: 'Check-Out Closing Soon!',
            description: 'Only 15 minutes left to check out.',
            actionLabel: 'Check Out Now',
            accentColor: 'bg-red-500',
        },
    };

    // Show a reminder popup
    const showReminder = useCallback((type, data = {}) => {
        if (isDismissedToday(type)) {
            console.log(`[AttendanceReminder] ${type} dismissed for today, skipping`);
            return;
        }

        const reminderConfig = REMINDER_CONFIG[type];
        if (!reminderConfig) return;

        setActiveReminder({ type, ...data, ...reminderConfig });
        setIsDialogOpen(true);
    }, []);

    // Fetch attendance settings and status
    const fetchAttendanceData = useCallback(async () => {
        if (!fullUser?.id || !fullUser?.schoolId || !canMarkAttendance || hasFetched.current) {
            setIsLoading(false);
            return null;
        }

        try {
            const res = await fetch(`/api/schools/${fullUser.schoolId}/attendance/mark?userId=${fullUser.id}`);

            if (!res.ok) {
                throw new Error('Failed to fetch attendance data');
            }

            const data = await res.json();

            setAttendanceSettings(data.config);
            setAttendanceStatus({
                attendance: data.attendance,
                isWorkingDay: data.isWorkingDay,
                dayType: data.dayType,
                windows: data.windows,
            });

            // Cache settings
            localStorage.setItem(STORAGE_KEYS.SETTINGS_CACHE, JSON.stringify({
                config: data.config,
                windows: data.windows,
                timestamp: Date.now(),
            }));

            hasFetched.current = true;
            console.log('[AttendanceReminder] Fetched attendance data');
            return data;
        } catch (e) {
            console.error('[AttendanceReminder] Error fetching attendance data:', e);

            // Try cached settings
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.SETTINGS_CACHE);
                if (cached) {
                    const data = JSON.parse(cached);
                    // Only use if less than 1 hour old
                    if (Date.now() - data.timestamp < 60 * 60 * 1000) {
                        setAttendanceSettings(data.config);
                        console.log('[AttendanceReminder] Using cached settings');
                    }
                }
            } catch (cacheError) {
                console.error('[AttendanceReminder] Cache read error:', cacheError);
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [fullUser, canMarkAttendance]);

    // Schedule reminders based on current time and settings
    const scheduleReminders = useCallback((data) => {
        if (!data || !data.isWorkingDay || hasScheduledToday.current) {
            return;
        }

        const now = new Date();

        // Clear existing timers
        timersRef.current.forEach(timer => clearTimeout(timer));
        timersRef.current = [];

        const { windows, config, attendance } = data;

        if (!windows?.checkIn) {
            console.log('[AttendanceReminder] No check-in window, skipping scheduling');
            return;
        }

        const checkInStart = new Date(windows.checkIn.start);
        const checkInEnd = new Date(windows.checkIn.end);
        const checkOutStart = windows.checkOut ? new Date(windows.checkOut.start) : null;
        const checkOutEnd = windows.checkOut ? new Date(windows.checkOut.end) : null;

        const gracePeriodMs = (config?.gracePeriod || 15) * 60 * 1000;
        const graceEnd = new Date(checkInStart.getTime() + gracePeriodMs);

        const isCheckedIn = !!attendance?.checkInTime;
        const isCheckedOut = !!attendance?.checkOutTime;

        // 1. CHECK_IN_OPEN
        if (!isCheckedIn && checkInStart > now) {
            const delay = checkInStart.getTime() - now.getTime();
            const timer = setTimeout(() => {
                showReminder(REMINDER_TYPES.CHECK_IN_OPEN);
            }, delay);
            timersRef.current.push(timer);
        } else if (!isCheckedIn && now >= checkInStart && now < checkInEnd) {
            // Already in window - show immediately
            setTimeout(() => showReminder(REMINDER_TYPES.CHECK_IN_OPEN), 2000);
        }

        // 2. LATE_WARNING
        if (!isCheckedIn && graceEnd > now) {
            const delay = graceEnd.getTime() - now.getTime();
            const timer = setTimeout(async () => {
                // Re-check status before showing
                const res = await fetch(`/api/schools/${fullUser.schoolId}/attendance/mark?userId=${fullUser.id}`);
                const status = await res.json();
                if (!status.attendance?.checkInTime) {
                    showReminder(REMINDER_TYPES.LATE_WARNING);
                }
            }, delay);
            timersRef.current.push(timer);
        }

        // 3. CHECK_OUT_OPEN
        if (isCheckedIn && !isCheckedOut && checkOutStart && checkOutStart > now) {
            const delay = checkOutStart.getTime() - now.getTime();
            const timer = setTimeout(() => {
                showReminder(REMINDER_TYPES.CHECK_OUT_OPEN);
            }, delay);
            timersRef.current.push(timer);
        }

        // 4. CHECK_OUT_WARNING (15 min before close)
        if (isCheckedIn && !isCheckedOut && checkOutEnd) {
            const warningTime = new Date(checkOutEnd.getTime() - 15 * 60 * 1000);
            if (warningTime > now) {
                const delay = warningTime.getTime() - now.getTime();
                const timer = setTimeout(async () => {
                    const res = await fetch(`/api/schools/${fullUser.schoolId}/attendance/mark?userId=${fullUser.id}`);
                    const status = await res.json();
                    if (status.attendance?.checkInTime && !status.attendance?.checkOutTime) {
                        showReminder(REMINDER_TYPES.CHECK_OUT_WARNING);
                    }
                }, delay);
                timersRef.current.push(timer);
            }
        }

        hasScheduledToday.current = true;
        console.log(`[AttendanceReminder] Scheduled ${timersRef.current.length} reminders`);
    }, [fullUser, showReminder]);

    // Initialize
    useEffect(() => {
        if (fullUser && canMarkAttendance) {
            fetchAttendanceData().then(data => {
                if (data) {
                    scheduleReminders(data);
                }
            });
        }
    }, [fullUser, canMarkAttendance, fetchAttendanceData, scheduleReminders]);

    // Handle visibility change (tab focus)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Check if it's a new day
                const today = getTodayKey();
                const lastCheck = localStorage.getItem('attendance_last_check_date');

                if (lastCheck !== today) {
                    hasScheduledToday.current = false;
                    hasFetched.current = false;
                    localStorage.setItem('attendance_last_check_date', today);

                    if (fullUser && canMarkAttendance) {
                        fetchAttendanceData().then(data => {
                            if (data) {
                                scheduleReminders(data);
                            }
                        });
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fullUser, canMarkAttendance, fetchAttendanceData, scheduleReminders]);

    // Cleanup
    useEffect(() => {
        return () => {
            timersRef.current.forEach(timer => clearTimeout(timer));
        };
    }, []);

    // Manual refresh
    const refreshAttendance = useCallback(async () => {
        setIsLoading(true);
        hasFetched.current = false;
        const data = await fetchAttendanceData();
        if (data) {
            hasScheduledToday.current = false;
            scheduleReminders(data);
        }
    }, [fetchAttendanceData, scheduleReminders]);

    const value = {
        activeReminder,
        isDialogOpen,
        attendanceSettings,
        attendanceStatus,
        isLoading,
        canMarkAttendance,
        dismissReminder,
        refreshAttendance,
        setIsDialogOpen,
    };

    return (
        <AttendanceReminderContext.Provider value={value}>
            {children}
            <AttendanceReminderPopup
                activeReminder={activeReminder}
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                dismissReminder={dismissReminder}
            />
        </AttendanceReminderContext.Provider>
    );
}

// Popup component for attendance reminders - supports dark/light mode
function AttendanceReminderPopup({ activeReminder, isDialogOpen, setIsDialogOpen, dismissReminder }) {
    const router = useRouter();
    const [dontRemindToday, setDontRemindToday] = useState(false);

    const handleAction = () => {
        dismissReminder(dontRemindToday);
        setDontRemindToday(false);
        router.push('/dashboard/markattendance');
    };

    const handleDismiss = () => {
        dismissReminder(dontRemindToday);
        setDontRemindToday(false);
    };

    if (!activeReminder) return null;

    // Determine urgency styling
    const isUrgent = activeReminder.type === REMINDER_TYPES.LATE_WARNING || activeReminder.type === REMINDER_TYPES.CHECK_OUT_WARNING;

    return (
        <AlertDialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) handleDismiss();
        }}>
            <AlertDialogContent className="sm:max-w-[420px] p-0 overflow-hidden dark:bg-[#1a1a2e] bg-white border dark:border-gray-700/50 border-gray-200 shadow-2xl">
                {/* Accent color bar at top */}
                <div className={`h-1.5 w-full ${activeReminder.accentColor || 'bg-blue-500'}`} />

                <div className="px-6 pt-5 pb-2">
                    <AlertDialogHeader className="items-center sm:items-center text-center sm:text-center">
                        {/* Emoji icon with pulse animation */}
                        <div className={`
                            w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3
                            ${isUrgent
                                ? 'bg-red-50 dark:bg-red-950/30 animate-pulse'
                                : 'bg-blue-50 dark:bg-blue-950/30'
                            }
                        `}>
                            {activeReminder.emoji}
                        </div>

                        <AlertDialogTitle className="text-xl font-bold dark:text-white text-gray-900">
                            {activeReminder.title}
                        </AlertDialogTitle>

                        <AlertDialogDescription className="text-sm dark:text-gray-400 text-gray-600 mt-1 leading-relaxed">
                            {activeReminder.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </div>

                <div className="px-6 pb-5">
                    {/* Don't remind today checkbox */}
                    <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={dontRemindToday}
                                onChange={(e) => setDontRemindToday(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="
                                w-4 h-4 rounded border-2 transition-all duration-200
                                dark:border-gray-600 border-gray-300
                                peer-checked:border-blue-500 peer-checked:bg-blue-500
                                dark:peer-checked:border-blue-400 dark:peer-checked:bg-blue-400
                                group-hover:border-blue-400 dark:group-hover:border-blue-500
                            " />
                            <svg
                                className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
                                viewBox="0 0 12 12"
                                fill="none"
                            >
                                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="text-xs dark:text-gray-400 text-gray-500">
                            Don&apos;t remind me again today
                        </span>
                    </label>

                    <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                        <AlertDialogAction
                            onClick={handleAction}
                            className={`
                                w-full justify-center font-semibold text-white rounded-lg py-2.5 transition-all duration-200
                                ${activeReminder.accentColor || 'bg-blue-500'}
                                hover:opacity-90 hover:shadow-lg
                                ${isUrgent ? 'animate-pulse hover:animate-none' : ''}
                            `}
                        >
                            {activeReminder.actionLabel}
                        </AlertDialogAction>

                        <AlertDialogCancel
                            onClick={handleDismiss}
                            className="
                                w-full justify-center font-medium rounded-lg py-2.5 transition-all duration-200
                                dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700
                                bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200
                                mt-0
                            "
                        >
                            Dismiss
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function useAttendanceReminder() {
    const context = useContext(AttendanceReminderContext);
    if (!context) {
        return {
            activeReminder: null,
            isDialogOpen: false,
            attendanceSettings: null,
            attendanceStatus: null,
            isLoading: false,
            canMarkAttendance: false,
            dismissReminder: () => { },
            refreshAttendance: () => { },
            setIsDialogOpen: () => { },
        };
    }
    return context
}
