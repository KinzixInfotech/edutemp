"use client";

// context/AttendanceReminderContext.jsx
// Optimized attendance reminder system for web dashboard
// Minimal API load - fetches settings once, calculates windows locally

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

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

    // Show a reminder (toast for web instead of modal)
    const showReminder = useCallback((type, data = {}) => {
        if (isDismissedToday(type)) {
            console.log(`[AttendanceReminder] ${type} dismissed for today, skipping`);
            return;
        }

        const config = {
            [REMINDER_TYPES.CHECK_IN_OPEN]: {
                title: '🕐 Check-In Time!',
                description: 'Attendance check-in is now open. Mark your attendance.',
                action: { label: 'Mark Attendance', onClick: () => window.location.href = '/dashboard/markattendance' },
            },
            [REMINDER_TYPES.LATE_WARNING]: {
                title: '⚠️ Late Check-In Warning',
                description: 'Grace period has ended. Check in now to avoid being marked late!',
                action: { label: 'Check In Now', onClick: () => window.location.href = '/dashboard/markattendance' },
            },
            [REMINDER_TYPES.CHECK_OUT_OPEN]: {
                title: '🏠 Check-Out Available',
                description: 'You can now check out. Don\'t forget to mark your exit!',
                action: { label: 'Check Out', onClick: () => window.location.href = '/dashboard/markattendance' },
            },
            [REMINDER_TYPES.CHECK_OUT_WARNING]: {
                title: '⏰ Check-Out Closing Soon!',
                description: 'Only 15 minutes left to check out.',
                action: { label: 'Check Out Now', onClick: () => window.location.href = '/dashboard/markattendance' },
            },
        };

        const reminderConfig = config[type];
        if (!reminderConfig) return;

        // Show toast notification
        toast(reminderConfig.title, {
            description: reminderConfig.description,
            duration: 10000,
            action: reminderConfig.action,
            onDismiss: () => {
                // Optional: track dismissal
            },
        });

        // Also set state for potential dialog display
        setActiveReminder({ type, ...data, ...reminderConfig });
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
        </AttendanceReminderContext.Provider>
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
    return context;
}
