/**
 * Dashboard Context Engine
 * Determines today's state using strict priority rules
 * 
 * Priority Order (only ONE state active):
 * 1. Holiday (from SchoolCalendar or CalendarEvent)
 * 2. Vacation (from CalendarEvent)
 * 3. Sunday (day of week check)
 * 4. Exam Day (from Exam.startDate/endDate)
 * 5. Half Day (from SchoolCalendar)
 * 6. Normal Working Day
 */

import prisma from '@/lib/prisma';
import { generateKey, getCache, setCache } from '@/lib/cache';

// Day type constants
export const DAY_TYPES = {
    HOLIDAY: 'HOLIDAY',
    VACATION: 'VACATION',
    SUNDAY: 'SUNDAY',
    EXAM: 'EXAM',
    HALF_DAY: 'HALF_DAY',
    WORKING: 'WORKING',
};

// Cache TTL: 1 hour
const CONTEXT_CACHE_TTL = 3600;

/**
 * Get the start and end of a date (for date comparisons)
 */
function getDateBounds(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

/**
 * Find the next working day from a given date
 */
async function findNextWorkingDay(schoolId, fromDate, maxDaysToCheck = 30) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + 1); // Start from tomorrow

    for (let i = 0; i < maxDaysToCheck; i++) {
        const context = await computeDayContext(schoolId, date, false); // Don't recursively find next working day
        if (context.dayType === DAY_TYPES.WORKING) {
            return date.toISOString().split('T')[0];
        }
        date.setDate(date.getDate() + 1);
    }

    return null;
}

/**
 * Compute the day context for a specific date
 * @param {string} schoolId - School UUID
 * @param {Date} date - Date to check (defaults to today)
 * @param {boolean} includeNextWorkingDay - Whether to include nextWorkingDay calculation
 * @returns {Object} Day context object
 */
async function computeDayContext(schoolId, date = new Date(), includeNextWorkingDay = true) {
    const { start: dayStart, end: dayEnd } = getDateBounds(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday

    // Initialize context
    const context = {
        dayType: DAY_TYPES.WORKING,
        isSunday: dayOfWeek === 0,
        isHoliday: false,
        isVacation: false,
        isExamDay: false,
        isHalfDay: false,
        isWorkingDay: true,
        attendanceExpected: true,
        staffAttendanceExpected: true,
        feeCollectionExpected: true,
        aiAllowed: true,
        nextWorkingDay: null,
        holidayName: null,
        eventDetails: null,
    };

    // 1. Check SchoolCalendar for holiday/half-day
    const calendarEntry = await prisma.schoolCalendar.findUnique({
        where: {
            schoolId_date: {
                schoolId,
                date: dayStart,
            },
        },
    });

    if (calendarEntry) {
        if (calendarEntry.isHoliday || calendarEntry.dayType === 'HOLIDAY') {
            context.dayType = DAY_TYPES.HOLIDAY;
            context.isHoliday = true;
            context.isWorkingDay = false;
            context.attendanceExpected = false;
            context.staffAttendanceExpected = false;
            context.feeCollectionExpected = false;
            context.aiAllowed = false;
            context.holidayName = calendarEntry.holidayName || 'Holiday';

            if (includeNextWorkingDay) {
                context.nextWorkingDay = await findNextWorkingDay(schoolId, date);
            }
            return context;
        }

        if (calendarEntry.dayType === 'VACATION') {
            context.dayType = DAY_TYPES.VACATION;
            context.isVacation = true;
            context.isWorkingDay = false;
            context.attendanceExpected = false;
            context.staffAttendanceExpected = false;
            context.feeCollectionExpected = false;
            context.aiAllowed = false;

            if (includeNextWorkingDay) {
                context.nextWorkingDay = await findNextWorkingDay(schoolId, date);
            }
            return context;
        }
    }

    // 2. Check CalendarEvent for holiday/vacation
    const events = await prisma.calendarEvent.findMany({
        where: {
            schoolId,
            startDate: { lte: dayEnd },
            endDate: { gte: dayStart },
            status: 'SCHEDULED',
            eventType: { in: ['HOLIDAY', 'VACATION'] },
        },
    });

    const holidayEvent = events.find(e => e.eventType === 'HOLIDAY');
    if (holidayEvent) {
        context.dayType = DAY_TYPES.HOLIDAY;
        context.isHoliday = true;
        context.isWorkingDay = false;
        context.attendanceExpected = false;
        context.staffAttendanceExpected = false;
        context.feeCollectionExpected = false;
        context.aiAllowed = false;
        context.holidayName = holidayEvent.title;
        context.eventDetails = { id: holidayEvent.id, title: holidayEvent.title };

        if (includeNextWorkingDay) {
            context.nextWorkingDay = await findNextWorkingDay(schoolId, date);
        }
        return context;
    }

    const vacationEvent = events.find(e => e.eventType === 'VACATION');
    if (vacationEvent) {
        context.dayType = DAY_TYPES.VACATION;
        context.isVacation = true;
        context.isWorkingDay = false;
        context.attendanceExpected = false;
        context.staffAttendanceExpected = false;
        context.feeCollectionExpected = false;
        context.aiAllowed = false;
        context.eventDetails = { id: vacationEvent.id, title: vacationEvent.title };

        if (includeNextWorkingDay) {
            context.nextWorkingDay = await findNextWorkingDay(schoolId, date);
        }
        return context;
    }

    // 3. Check for Sunday
    const bypassSunday = process.env.BYPASS_SUNDAY === 'true';
    if (dayOfWeek === 0 && !bypassSunday) {
        context.dayType = DAY_TYPES.SUNDAY;
        context.isWorkingDay = false;
        context.attendanceExpected = false;
        context.staffAttendanceExpected = false;
        context.feeCollectionExpected = false;
        context.aiAllowed = false;

        if (includeNextWorkingDay) {
            context.nextWorkingDay = await findNextWorkingDay(schoolId, date);
        }
        return context;
    }

    // 4. Check for Exam Day
    const exams = await prisma.exam.findMany({
        where: {
            schoolId,
            status: 'SCHEDULED',
            startDate: { lte: dayEnd },
            endDate: { gte: dayStart },
        },
    });

    if (exams.length > 0) {
        context.dayType = DAY_TYPES.EXAM;
        context.isExamDay = true;
        // Exams are still working days, but with different expectations
        context.attendanceExpected = true; // Still expected, but may vary
        context.staffAttendanceExpected = true;
        context.feeCollectionExpected = true;
        context.aiAllowed = true;
        context.eventDetails = { examCount: exams.length, exams: exams.map(e => e.title) };
        return context;
    }

    // 5. Check for Half Day (from SchoolCalendar dayType)
    if (calendarEntry && calendarEntry.dayType === 'HALF_DAY') {
        context.dayType = DAY_TYPES.HALF_DAY;
        context.isHalfDay = true;
        context.attendanceExpected = true;
        context.staffAttendanceExpected = true;
        context.feeCollectionExpected = true;
        context.aiAllowed = true;
        return context;
    }

    // 6. Default: Normal Working Day
    return context;
}

/**
 * Get dashboard context for a school (with caching)
 * @param {string} schoolId - School UUID
 * @param {Date} date - Date to check (defaults to today)
 * @returns {Object} Day context object
 */
export async function getDashboardContext(schoolId, date = new Date()) {
    if (!schoolId) {
        throw new Error('schoolId is required');
    }

    // Normalize date to just the date part for caching
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = generateKey('dashboard-context', { schoolId, date: dateStr });

    // Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
        return cached;
    }

    // Compute context
    const context = await computeDayContext(schoolId, date);

    // Add metadata
    context.date = dateStr;
    context.computedAt = new Date().toISOString();

    // Cache the result
    await setCache(cacheKey, context, CONTEXT_CACHE_TTL);

    return context;
}

/**
 * Invalidate context cache for a school
 * Use this when calendar events or exams are modified
 */
export async function invalidateContextCache(schoolId, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = generateKey('dashboard-context', { schoolId, date: dateStr });

    const { delCache } = await import('@/lib/cache');
    await delCache(cacheKey);
}

export default {
    getDashboardContext,
    invalidateContextCache,
    DAY_TYPES,
};
