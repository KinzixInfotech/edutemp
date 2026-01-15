// ============================================
// FILE: app/api/cron/auto-mark-absent/route.js
// Optimized Cron job for auto-marking absent students
// With caching, IST timezone, and GROUPED push notifications
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCache, setCache, generateKey, invalidatePattern } from '@/lib/cache';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// Configuration
const CONFIG = {
    BATCH_SIZE: 100,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    PARALLEL_SCHOOLS: 3,
    CHECK_MODE: 'ACADEMIC_YEAR', // 'ACADEMIC_YEAR' or 'DAYS'
    DAYS_TO_CHECK: 7,
    MAX_DAYS_BACK: 180,
    TIMEOUT: 300000,
    CACHE_TTL: 3600, // 1 hour cache for school configs
};

// IST Timezone offset: UTC+5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Get current IST date
const getCurrentISTDate = () => {
    const now = new Date();
    const istTime = new Date(now.getTime() + IST_OFFSET_MS);
    return new Date(istTime.toISOString().split('T')[0]);
};

// Get IST time string (HH:MM)
const getCurrentISTTime = () => {
    const now = new Date();
    const istTime = new Date(now.getTime() + IST_OFFSET_MS);
    return istTime.toISOString().substr(11, 5);
};

// Normalize date to IST date without time
const ISTDate = (input) => {
    if (!input) return getCurrentISTDate();

    // If already YYYY-MM-DD string
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [y, m, d] = input.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
    }

    // Convert to IST and extract date
    const date = new Date(input);
    const istDate = new Date(date.getTime() + IST_OFFSET_MS);
    const dateStr = istDate.toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

// Format date for display in IST (short format)
const formatISTDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

// Format date short (for notifications)
const formatShortDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short'
    });
};

export async function GET(request) {
    const startTime = Date.now();
    const currentISTTime = getCurrentISTTime();

    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[CRON] Auto-mark absent started at IST ${currentISTTime}`);

        const todayIST = getCurrentISTDate();

        // IMPORTANT: This cron should run at 8-9 PM IST when all school check-in windows are closed
        // endDate is TODAY because at 8-9 PM, no one can check in anymore
        const endDate = new Date(todayIST); // Today (not yesterday)

        // Start date depends on mode (will be refined per school)
        let defaultStartDate = new Date(endDate);
        defaultStartDate.setDate(defaultStartDate.getDate() - (CONFIG.DAYS_TO_CHECK - 1));

        // Safety limit
        const maxStartDate = new Date(endDate);
        maxStartDate.setDate(maxStartDate.getDate() - CONFIG.MAX_DAYS_BACK);

        console.log(`[CRON] Today (IST): ${formatISTDate(todayIST)}`);
        console.log(`[CRON] Processing up to: ${formatISTDate(endDate)} (yesterday)`);
        console.log(`[CRON] Current IST Time: ${currentISTTime}`);

        // Get all active schools with auto-mark enabled (cached)
        const schools = await getEnabledSchools();

        console.log(`[CRON] Found ${schools.length} schools with auto-mark enabled`);

        if (schools.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No schools with auto-mark enabled',
                stats: { schoolsProcessed: 0, totalMarked: 0, totalNotified: 0, totalErrors: 0 },
                executionTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                timezone: 'Asia/Kolkata (IST)'
            });
        }

        let totalMarked = 0;
        let totalNotified = 0;
        let totalErrors = 0;
        const schoolResults = [];

        // Process schools in parallel batches
        for (let i = 0; i < schools.length; i += CONFIG.PARALLEL_SCHOOLS) {
            const schoolBatch = schools.slice(i, i + CONFIG.PARALLEL_SCHOOLS);

            const batchPromises = schoolBatch.map(async (school) => {
                const schoolStartTime = Date.now();
                console.log(`[SCHOOL ${school.id}] Processing ${school.name}`);

                try {
                    // No time check needed - cron runs at fixed scheduled time
                    console.log(`[SCHOOL ${school.id}] Processing attendance for ${school.name}`);

                    // Determine start date for this school based on academic year
                    let schoolStartDate = defaultStartDate;

                    if (CONFIG.CHECK_MODE === 'ACADEMIC_YEAR' && school.academicYearStart) {
                        const acYearStart = ISTDate(school.academicYearStart);
                        schoolStartDate = acYearStart > maxStartDate ? acYearStart : maxStartDate;
                    }

                    const result = await processSchool(school, schoolStartDate, endDate);

                    totalMarked += result.markedCount;
                    totalNotified += result.notifiedCount;
                    totalErrors += result.errorCount;

                    return {
                        schoolId: school.id,
                        schoolName: school.name,
                        markedCount: result.markedCount,
                        notifiedCount: result.notifiedCount,
                        errorCount: result.errorCount,
                        daysProcessed: result.daysProcessed,
                        studentsNotified: result.studentsNotified,
                        dateRange: {
                            start: formatISTDate(result.startDate),
                            end: formatISTDate(result.endDate),
                        },
                        executionTime: Date.now() - schoolStartTime,
                    };
                } catch (error) {
                    console.error(`[SCHOOL ${school.id}] Error:`, error.message);
                    totalErrors++;

                    return {
                        schoolId: school.id,
                        schoolName: school.name,
                        error: error.message,
                        executionTime: Date.now() - schoolStartTime,
                    };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);

            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    schoolResults.push(result.value);
                } else {
                    console.error('[BATCH ERROR]', result.reason);
                    totalErrors++;
                }
            });
        }

        // Invalidate attendance caches after processing
        await invalidatePattern('attendance:*');

        const executionTime = Date.now() - startTime;
        console.log(`[CRON] Completed in ${executionTime}ms - Marked: ${totalMarked}, Notified: ${totalNotified}`);

        return NextResponse.json({
            success: true,
            message: 'Auto-mark absent completed successfully',
            stats: {
                schoolsProcessed: schoolResults.filter(r => !r.skipped).length,
                schoolsSkipped: schoolResults.filter(r => r.skipped).length,
                totalMarked,
                totalNotified,
                totalErrors,
                executionTime,
            },
            schools: schoolResults,
            timestamp: new Date().toISOString(),
            timezone: 'Asia/Kolkata (IST)',
            currentISTTime
        });

    } catch (error) {
        console.error('[CRON ERROR]', error);
        return NextResponse.json(
            {
                error: 'Failed to process auto-mark absent',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                executionTime: Date.now() - startTime,
            },
            { status: 500 }
        );
    }
}

// Get schools with auto-mark enabled (cached)
async function getEnabledSchools() {
    const cacheKey = generateKey('cron:automark', 'enabled-schools');

    const cached = await getCache(cacheKey);
    if (cached) {
        console.log('[CACHE] Using cached enabled schools list');
        return cached;
    }

    const schools = await prisma.school.findMany({
        where: {
            deletedAt: null,
            attendanceConfig: {
                autoMarkAbsent: true
            }
        },
        select: {
            id: true,
            name: true,
            attendanceConfig: {
                select: {
                    autoMarkAbsent: true,
                    autoMarkTime: true,
                    notifyParents: true,
                },
            },
            AcademicYear: {
                where: { isActive: true },
                take: 1,
                select: {
                    id: true,
                    startDate: true,
                    endDate: true,
                },
            },
        },
    });

    // Flatten for easier access
    const enabledSchools = schools.map(school => ({
        id: school.id,
        name: school.name,
        attendanceConfig: school.attendanceConfig,
        academicYearId: school.AcademicYear[0]?.id,
        academicYearStart: school.AcademicYear[0]?.startDate,
        academicYearEnd: school.AcademicYear[0]?.endDate,
        notifyParents: school.attendanceConfig?.notifyParents ?? true,
    }));

    await setCache(cacheKey, enabledSchools, CONFIG.CACHE_TTL);
    return enabledSchools;
}

// Process a single school - NOW PROCESSES ALL DAYS FIRST, THEN SENDS GROUPED NOTIFICATIONS
async function processSchool(school, startDate, endDate) {
    if (!school.academicYearId) {
        console.log(`[SCHOOL ${school.id}] No active academic year`);
        return {
            markedCount: 0,
            notifiedCount: 0,
            errorCount: 0,
            daysProcessed: 0,
            studentsNotified: 0,
            startDate,
            endDate,
        };
    }

    console.log(`[SCHOOL ${school.id}] Checking ${formatISTDate(startDate)} to ${formatISTDate(endDate)}`);

    // Get working days in range
    let workingDays = await prisma.schoolCalendar.findMany({
        where: {
            schoolId: school.id,
            date: {
                gte: startDate,
                lte: endDate,
            },
            dayType: 'WORKING_DAY',
            isHoliday: false,
        },
        orderBy: { date: 'asc' },
    });

    // If no SchoolCalendar entries, generate working days (Monday-Saturday)
    if (workingDays.length === 0) {
        console.log(`[SCHOOL ${school.id}] No SchoolCalendar found, generating Mon-Sat as working days`);
        workingDays = generateWorkingDays(school.id, startDate, endDate);
    }

    console.log(`[SCHOOL ${school.id}] ${workingDays.length} working days to process`);

    if (workingDays.length === 0) {
        return {
            markedCount: 0,
            notifiedCount: 0,
            errorCount: 0,
            daysProcessed: 0,
            studentsNotified: 0,
            startDate,
            endDate,
        };
    }

    let totalMarked = 0;
    let totalErrors = 0;

    // Collect all absent records for grouped notifications
    // Map: userId -> { user info, dates: [] }
    const absentStudentsMap = new Map();

    // Process each working day - mark absent and collect data
    for (const workingDay of workingDays) {
        try {
            const result = await processDayAndCollect(
                school.id,
                workingDay.date,
                school.academicYearId,
                absentStudentsMap
            );

            totalMarked += result.markedCount;
            totalErrors += result.errorCount;
        } catch (error) {
            console.error(`[SCHOOL ${school.id}] Error on ${formatISTDate(workingDay.date)}:`, error.message);
            totalErrors++;
        }
    }

    // Now send GROUPED notifications (one per student + parents)
    let totalNotified = 0;
    let studentsNotified = 0;

    if (school.notifyParents && absentStudentsMap.size > 0) {
        const notifyResult = await sendGroupedNotifications(school.id, absentStudentsMap);
        totalNotified = notifyResult.notifiedCount;
        studentsNotified = notifyResult.studentsNotified;
    }

    return {
        markedCount: totalMarked,
        notifiedCount: totalNotified,
        errorCount: totalErrors,
        daysProcessed: workingDays.length,
        studentsNotified,
        startDate,
        endDate,
    };
}

// Generate working days (Mon-Sat) when no calendar exists
function generateWorkingDays(schoolId, startDate, endDate) {
    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
        const dayOfWeek = current.getDay();

        // Include Monday (1) to Saturday (6), exclude Sunday (0)
        if (dayOfWeek !== 0) {
            days.push({
                date: new Date(current),
                schoolId,
                dayType: 'WORKING_DAY',
            });
        }
        current.setDate(current.getDate() + 1);
    }

    return days;
}

// Process a single day - mark absent and collect for grouped notifications
async function processDayAndCollect(schoolId, date, academicYearId, absentStudentsMap) {
    const normalizedDate = ISTDate(date);

    // Get all active users who should have attendance (Students and Staff)
    // Include student details for notification: name, class, section
    const activeUsers = await prisma.user.findMany({
        where: {
            schoolId,
            status: 'ACTIVE',
            deletedAt: null,
            role: {
                name: { in: ['STUDENT', 'TEACHER', 'TEACHING_STAFF', 'NON_TEACHING_STAFF'] },
            },
        },
        select: {
            id: true,
            name: true,
            roleId: true,
            role: { select: { name: true } },
            // Get student info with class & section for notification
            student: {
                select: {
                    name: true, // Student's name (fallback if User.name is null)
                    class: { select: { className: true } },
                    section: { select: { name: true } },
                    studentParentLinks: {
                        where: { isActive: true },
                        select: {
                            parent: {
                                select: { userId: true }
                            }
                        }
                    }
                }
            }
        },
    });

    if (activeUsers.length === 0) {
        return { markedCount: 0, errorCount: 0 };
    }

    // Get users who already have attendance marked
    const existingAttendance = await prisma.attendance.findMany({
        where: {
            schoolId,
            date: normalizedDate,
        },
        select: { userId: true },
    });

    const markedUserIds = new Set(existingAttendance.map((a) => a.userId));
    const unmarkedUsers = activeUsers.filter((user) => !markedUserIds.has(user.id));

    console.log(`[DAY ${formatISTDate(normalizedDate)}] ${unmarkedUsers.length} users to mark absent`);

    if (unmarkedUsers.length === 0) {
        return { markedCount: 0, errorCount: 0 };
    }

    // Mark users as absent in batches
    let markedCount = 0;
    let errorCount = 0;

    const batches = [];
    for (let i = 0; i < unmarkedUsers.length; i += CONFIG.BATCH_SIZE) {
        batches.push(unmarkedUsers.slice(i, i + CONFIG.BATCH_SIZE));
    }

    for (const batch of batches) {
        try {
            const result = await markBatchAbsentWithRetry(schoolId, normalizedDate, batch, academicYearId);
            markedCount += result.successCount;
            errorCount += result.errorCount;

            // Collect user data for grouped notifications (students, teachers, staff)
            for (const user of batch) {
                const roleName = user.role?.name;

                if (!absentStudentsMap.has(user.id)) {
                    let userData = {
                        userId: user.id,
                        name: user.name || 'Unknown',
                        className: '',
                        sectionName: '',
                        roleType: roleName,
                        parentUserIds: [],
                        dates: []
                    };

                    if (roleName === 'STUDENT') {
                        // For students: get name from Student model, include class/section/parents
                        userData.name = user.student?.name || 'Unknown Student';
                        userData.className = user.student?.class?.className || 'N/A';
                        userData.sectionName = user.student?.section?.name || '';
                        userData.parentUserIds = user.student?.studentParentLinks?.map(l => l.parent?.userId).filter(Boolean) || [];
                    } else if (['TEACHER', 'TEACHING_STAFF', 'NON_TEACHING_STAFF'].includes(roleName)) {
                        // For teachers/staff: use user.name, show role instead of class
                        userData.className = roleName.replace('_', ' ');
                    }

                    absentStudentsMap.set(user.id, userData);
                }
                absentStudentsMap.get(user.id).dates.push(normalizedDate);
            }
        } catch (error) {
            console.error(`[BATCH ERROR]`, error.message);
            errorCount += batch.length;
        }
    }

    // Update attendance stats asynchronously
    if (markedCount > 0) {
        updateDayStats(schoolId, normalizedDate, academicYearId).catch((err) => {
            console.error(`[STATS ERROR]`, err.message);
        });
    }

    return { markedCount, errorCount };
}

// Send GROUPED notifications - PERSONALIZED per recipient
// Self: "You were marked absent..."
// Parents: "Your child [name] was marked absent..."
async function sendGroupedNotifications(schoolId, absentUsersMap) {
    let notifiedCount = 0;
    let usersNotified = 0;

    console.log(`[NOTIFY] Sending grouped notifications for ${absentUsersMap.size} users`);

    for (const [userId, userData] of absentUsersMap) {
        try {
            const { name, className, sectionName, roleType, parentUserIds, dates } = userData;

            // Format dates nicely
            const sortedDates = dates.sort((a, b) => a - b);
            const datesList = sortedDates.map(d => formatShortDate(d)).join(', ');
            const daysCount = dates.length;

            // Build info string (class/section for students, role for staff)
            let infoStr = '';
            if (roleType === 'STUDENT') {
                infoStr = sectionName ? `${className} - ${sectionName}` : className;
            } else {
                infoStr = roleType.replace(/_/g, ' '); // TEACHING_STAFF → TEACHING STAFF
            }

            // Common metadata for all notifications
            const commonMetadata = {
                userId,
                userName: name,
                roleType,
                infoStr,
                absentDates: sortedDates.map(d => d.toISOString()),
                daysCount,
                action: 'AUTO_MARK_ABSENT_GROUPED'
            };

            // 1. Send SELF notification (first-person: "You were marked absent...")
            const selfTitle = `⚠️ Absence Alert`;
            const selfMessage = daysCount === 1
                ? `You were marked absent on ${datesList} because you didn't check in.`
                : `You were marked absent on ${daysCount} days (${datesList}) because you didn't check in.`;

            await sendNotification({
                schoolId,
                title: selfTitle,
                message: selfMessage,
                type: 'ATTENDANCE',
                priority: daysCount >= 3 ? 'URGENT' : 'HIGH',
                icon: '⚠️',
                targetOptions: { userIds: [userId] },
                metadata: { ...commonMetadata, recipientType: 'SELF' },
                actionUrl: '/dashboard/markattendance',
                sendPush: true
            });
            notifiedCount++;

            // 2. Send PARENT notifications (third-person: "Your child [name] was marked absent...")
            if (roleType === 'STUDENT' && parentUserIds.length > 0) {
                const parentTitle = `⚠️ Absence Alert: ${name}`;
                const parentMessage = daysCount === 1
                    ? `Your child ${name} (${infoStr}) was marked absent on ${datesList}.`
                    : `Your child ${name} (${infoStr}) was marked absent on ${daysCount} days: ${datesList}.`;

                await sendNotification({
                    schoolId,
                    title: parentTitle,
                    message: parentMessage,
                    type: 'ATTENDANCE',
                    priority: daysCount >= 3 ? 'URGENT' : 'HIGH',
                    icon: '⚠️',
                    targetOptions: { userIds: parentUserIds },
                    metadata: { ...commonMetadata, recipientType: 'PARENT' },
                    actionUrl: '/dashboard/attendance',
                    sendPush: true
                });
                notifiedCount += parentUserIds.length;
            }

            usersNotified++;
            console.log(`[NOTIFY] Sent personalized notifications for ${name} (${infoStr}) - ${daysCount} days absent`);

        } catch (error) {
            console.error(`[NOTIFY ERROR] Failed for user ${userId}:`, error.message);
        }
    }

    console.log(`[NOTIFY] Total: ${usersNotified} users, ${notifiedCount} notifications sent`);

    return { notifiedCount, studentsNotified: usersNotified };
}

// Mark batch as absent with retry logic
async function markBatchAbsentWithRetry(schoolId, date, users, academicYearId, attempt = 1) {
    try {
        const attendanceRecords = users.map((user) => ({
            userId: user.id,
            schoolId,
            date,
            status: 'ABSENT',
            markedBy: null,
            markedAt: new Date(),
            remarks: 'Auto-marked absent by system',
            requiresApproval: false,
            approvalStatus: 'NOT_REQUIRED',
        }));

        const result = await prisma.attendance.createMany({
            data: attendanceRecords,
            skipDuplicates: true,
        });

        return {
            successCount: result.count,
            errorCount: users.length - result.count,
        };
    } catch (error) {
        console.error(`[BATCH] Attempt ${attempt} failed:`, error.message);

        if (attempt < CONFIG.MAX_RETRIES) {
            const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return markBatchAbsentWithRetry(schoolId, date, users, academicYearId, attempt + 1);
        }

        return { successCount: 0, errorCount: users.length };
    }
}

// Update attendance stats for a specific day
async function updateDayStats(schoolId, date, academicYearId) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 0));

    const users = await prisma.attendance.groupBy({
        by: ['userId'],
        where: {
            schoolId,
            date: { gte: monthStart, lte: monthEnd },
        },
    });

    for (const user of users) {
        const stats = await prisma.attendance.groupBy({
            by: ['status'],
            where: {
                userId: user.userId,
                schoolId,
                date: { gte: monthStart, lte: monthEnd },
            },
            _count: { id: true },
            _avg: { workingHours: true },
        });

        const workingDays = await prisma.schoolCalendar.count({
            where: {
                schoolId,
                date: { gte: monthStart, lte: monthEnd },
                dayType: 'WORKING_DAY',
            },
        });

        const totalPresent = stats.find((s) => s.status === 'PRESENT')?._count.id || 0;
        const totalAbsent = stats.find((s) => s.status === 'ABSENT')?._count.id || 0;
        const totalHalfDay = stats.find((s) => s.status === 'HALF_DAY')?._count.id || 0;
        const totalLate = stats.find((s) => s.status === 'LATE')?._count.id || 0;
        const totalLeaves = stats.find((s) => s.status === 'ON_LEAVE')?._count.id || 0;
        const totalHolidays = stats.find((s) => s.status === 'HOLIDAY')?._count.id || 0;

        const attendancePercentage = workingDays > 0
            ? ((totalPresent + totalLate + totalHalfDay * 0.5) / workingDays) * 100
            : 0;

        const avgWorkingHours = stats.reduce((acc, s) => acc + (s._avg.workingHours || 0), 0) / (stats.length || 1);

        await prisma.attendanceStats.upsert({
            where: {
                userId_academicYearId_month_year: {
                    userId: user.userId,
                    academicYearId,
                    month,
                    year,
                },
            },
            update: {
                totalWorkingDays: workingDays,
                totalPresent,
                totalAbsent,
                totalHalfDay,
                totalLate,
                totalLeaves,
                totalHolidays,
                attendancePercentage,
                avgWorkingHours,
                lastCalculated: new Date(),
            },
            create: {
                userId: user.userId,
                schoolId,
                academicYearId,
                month,
                year,
                totalWorkingDays: workingDays,
                totalPresent,
                totalAbsent,
                totalHalfDay,
                totalLate,
                totalLeaves,
                totalHolidays,
                attendancePercentage,
                avgWorkingHours,
            },
        });
    }
}