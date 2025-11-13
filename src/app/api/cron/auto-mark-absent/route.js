// ============================================
// FILE: app/api/cron/auto-mark-absent/route.js
// FIXED Cron job for auto-marking absent students
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
};

// Helper: Normalize date to local date without time
const ISTDate = (input) => {
    if (!input) return new Date(new Date().toDateString());
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [y, m, d] = input.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(new Date(input).toDateString());
};

export async function GET(request) {
    const startTime = Date.now();

    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[CRON] Auto-mark absent started');

        const now = new Date();
        const today = ISTDate(now);

        // Calculate date range to check (yesterday and before)
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1); // Yesterday

        // Start date depends on mode
        let startDate;

        if (CONFIG.CHECK_MODE === 'ACADEMIC_YEAR') {
            // Will be determined per school - use a fallback for now
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - CONFIG.DAYS_TO_CHECK);
            console.log(`[CRON] Mode: ACADEMIC_YEAR - Using fallback start date`);
        } else {
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - (CONFIG.DAYS_TO_CHECK - 1));
            console.log(`[CRON] Mode: DAYS - Checking last ${CONFIG.DAYS_TO_CHECK} days`);
        }

        // Safety limit
        const maxStartDate = new Date(endDate);
        maxStartDate.setDate(maxStartDate.getDate() - CONFIG.MAX_DAYS_BACK);

        console.log(`[CRON] End date: ${endDate.toISOString()}`);
        console.log(`[CRON] Start date (fallback): ${startDate.toISOString()}`);
        console.log(`[CRON] Max lookback date: ${maxStartDate.toISOString()}`);

        // Get all active schools
        const schools = await prisma.school.findMany({
            where: {
                deletedAt: null,
            },
            select: {
                id: true,
                name: true,
                attendanceConfig: {
                    select: {
                        autoMarkAbsent: true,
                        autoMarkTime: true,
                    },
                },
                AcademicYear: {
                    where: {
                        isActive: true,
                    },
                    select: {
                        id: true,
                        startDate: true,
                        endDate: true,
                    },
                },
            },
        });

        console.log(`[CRON] Found ${schools.length} schools to process`);

        if (schools.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No schools found',
                stats: {
                    schoolsProcessed: 0,
                    totalMarked: 0,
                    totalErrors: 0,
                },
                executionTime: Date.now() - startTime,
            });
        }

        // Filter schools with auto-mark enabled
        const enabledSchools = schools.filter(
            (school) => school.attendanceConfig?.autoMarkAbsent !== false
        );

        console.log(`[CRON] ${enabledSchools.length} schools have auto-mark enabled`);

        let totalMarked = 0;
        let totalErrors = 0;
        const schoolResults = [];

        // Process schools in parallel batches
        for (let i = 0; i < enabledSchools.length; i += CONFIG.PARALLEL_SCHOOLS) {
            const schoolBatch = enabledSchools.slice(i, i + CONFIG.PARALLEL_SCHOOLS);

            const batchPromises = schoolBatch.map(async (school) => {
                const schoolStartTime = Date.now();

                console.log(`[SCHOOL ${school.id}] Processing ${school.name}`);

                try {
                    // Determine start date for this school
                    let schoolStartDate = startDate;

                    if (CONFIG.CHECK_MODE === 'ACADEMIC_YEAR' && school.AcademicYear && school.AcademicYear.length > 0) {
                        const academicYearStart = ISTDate(school.AcademicYear[0].startDate);
                        schoolStartDate = academicYearStart > maxStartDate ? academicYearStart : maxStartDate;
                        console.log(`[SCHOOL ${school.id}] Using academic year start: ${schoolStartDate.toISOString()}`);
                    } else if (!schoolStartDate) {
                        schoolStartDate = maxStartDate;
                        console.log(`[SCHOOL ${school.id}] Using max lookback: ${schoolStartDate.toISOString()}`);
                    }

                    const result = await processSchool(school, schoolStartDate, endDate);

                    totalMarked += result.markedCount;
                    totalErrors += result.errorCount;

                    return {
                        schoolId: school.id,
                        schoolName: school.name,
                        markedCount: result.markedCount,
                        errorCount: result.errorCount,
                        daysProcessed: result.daysProcessed,
                        dateRange: {
                            start: result.startDate,
                            end: result.endDate,
                        },
                        details: result.details.length > 10 ? result.details.slice(-10) : result.details,
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

        const executionTime = Date.now() - startTime;
        console.log(`[CRON] Completed in ${executionTime}ms`);

        return NextResponse.json({
            success: true,
            message: 'Auto-mark absent completed successfully',
            stats: {
                schoolsProcessed: schoolResults.length,
                totalMarked,
                totalErrors,
                executionTime,
            },
            schools: schoolResults,
            dateRange: {
                start: startDate?.toISOString() || 'N/A', // FIX: Handle null case
                end: endDate.toISOString(),
            },
            timestamp: new Date().toISOString(),
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

// Process a single school
async function processSchool(school, startDate, endDate) {
    const schoolStartTime = Date.now();

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
        where: {
            schoolId: school.id,
            isActive: true,
        },
        select: {
            id: true,
            startDate: true,
            endDate: true,
        },
    });

    if (!academicYear) {
        console.log(`[SCHOOL ${school.id}] No active academic year`);
        return {
            markedCount: 0,
            errorCount: 0,
            daysProcessed: 0,
            details: [],
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        };
    }

    console.log(`[SCHOOL ${school.id}] Checking from ${startDate.toISOString()} to ${endDate.toISOString()}`);

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
        orderBy: {
            date: 'asc',
        },
    });

    console.log(`[SCHOOL ${school.id}] Found ${workingDays.length} working days in SchoolCalendar`);

    // If no SchoolCalendar entries, generate working days (Monday-Saturday)
    if (workingDays.length === 0) {
        console.log(`[SCHOOL ${school.id}] No SchoolCalendar found, generating working days (Mon-Sat)`);

        workingDays = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const dayOfWeek = current.getDay();

            // Include Monday (1) to Saturday (6), exclude Sunday (0)
            if (dayOfWeek !== 0) {
                workingDays.push({
                    date: new Date(current),
                    schoolId: school.id,
                    dayType: 'WORKING_DAY',
                });
            }

            current.setDate(current.getDate() + 1);
        }

        console.log(`[SCHOOL ${school.id}] Generated ${workingDays.length} working days`);
    }

    if (workingDays.length === 0) {
        return {
            markedCount: 0,
            errorCount: 0,
            daysProcessed: 0,
            details: [],
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        };
    }

    let totalMarked = 0;
    let totalErrors = 0;
    const dayDetails = [];

    // Process each working day
    for (const workingDay of workingDays) {
        try {
            const result = await processDay(school.id, workingDay.date, academicYear.id);

            totalMarked += result.markedCount;
            totalErrors += result.errorCount;

            if (result.markedCount > 0 || result.errorCount > 0) {
                dayDetails.push({
                    date: workingDay.date.toISOString(),
                    markedCount: result.markedCount,
                    errorCount: result.errorCount,
                });
            }
        } catch (error) {
            console.error(`[SCHOOL ${school.id}] Error processing day ${workingDay.date}:`, error.message);
            totalErrors++;

            dayDetails.push({
                date: workingDay.date.toISOString(),
                error: error.message,
            });
        }
    }

    return {
        markedCount: totalMarked,
        errorCount: totalErrors,
        daysProcessed: workingDays.length,
        details: dayDetails,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        executionTime: Date.now() - schoolStartTime,
    };
}

// Process a single day
async function processDay(schoolId, date, academicYearId) {
    const normalizedDate = ISTDate(date);

    // Get all active users who should have attendance
    const activeUsers = await prisma.user.findMany({
        where: {
            schoolId,
            status: 'ACTIVE',
            deletedAt: null,
            role: {
                name: {
                    in: ['STUDENT', 'TEACHER', 'TEACHING_STAFF', 'NON_TEACHING_STAFF'],
                },
            },
        },
        select: {
            id: true,
            name: true,
            roleId: true,
        },
    });

    console.log(`[SCHOOL ${schoolId}] [${normalizedDate.toDateString()}] Found ${activeUsers.length} active users`);

    if (activeUsers.length === 0) {
        return {
            markedCount: 0,
            errorCount: 0,
        };
    }

    // Get users who already have attendance marked for this day
    const existingAttendance = await prisma.attendance.findMany({
        where: {
            schoolId,
            date: normalizedDate,
        },
        select: {
            userId: true,
        },
    });

    const markedUserIds = new Set(existingAttendance.map((a) => a.userId));

    // Find users who need to be marked absent
    const unmarkedUsers = activeUsers.filter((user) => !markedUserIds.has(user.id));

    console.log(`[SCHOOL ${schoolId}] [${normalizedDate.toDateString()}] ${unmarkedUsers.length} users need to be marked absent (out of ${activeUsers.length} active users, ${existingAttendance.length} already marked)`);

    if (unmarkedUsers.length === 0) {
        return {
            markedCount: 0,
            errorCount: 0,
        };
    }

    // Mark users as absent in batches
    let markedCount = 0;
    let errorCount = 0;

    const batches = [];
    for (let i = 0; i < unmarkedUsers.length; i += CONFIG.BATCH_SIZE) {
        batches.push(unmarkedUsers.slice(i, i + CONFIG.BATCH_SIZE));
    }

    console.log(`[SCHOOL ${schoolId}] [${normalizedDate.toDateString()}] Processing ${batches.length} batches`);

    for (const batch of batches) {
        try {
            const result = await markBatchAbsentWithRetry(
                schoolId,
                normalizedDate,
                batch,
                academicYearId
            );

            markedCount += result.successCount;
            errorCount += result.errorCount;
        } catch (error) {
            console.error(`[BATCH ERROR]`, error.message);
            errorCount += batch.length;
        }
    }

    // Update attendance stats for this day asynchronously
    if (markedCount > 0) {
        updateDayStats(schoolId, normalizedDate, academicYearId).catch((err) => {
            console.error(`[STATS ERROR] Failed to update stats:`, err.message);
        });
    }

    return {
        markedCount,
        errorCount,
    };
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

        console.log(`[BATCH SUCCESS] Marked ${result.count} users as absent`);

        return {
            successCount: result.count,
            errorCount: users.length - result.count,
        };
    } catch (error) {
        console.error(`[BATCH] Attempt ${attempt} failed:`, error.message);

        // Retry with exponential backoff
        if (attempt < CONFIG.MAX_RETRIES) {
            const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return markBatchAbsentWithRetry(schoolId, date, users, academicYearId, attempt + 1);
        }

        return {
            successCount: 0,
            errorCount: users.length,
        };
    }
}

// Update attendance stats for a specific day
async function updateDayStats(schoolId, date, academicYearId) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const monthStart = ISTDate(new Date(year, month - 1, 1));
    const monthEnd = ISTDate(new Date(year, month, 0));

    const users = await prisma.attendance.groupBy({
        by: ['userId'],
        where: {
            schoolId,
            date: {
                gte: monthStart,
                lte: monthEnd,
            },
        },
    });

    console.log(`[STATS] Updating stats for ${users.length} users`);

    for (const user of users) {
        const stats = await prisma.attendance.groupBy({
            by: ['status'],
            where: {
                userId: user.userId,
                schoolId,
                date: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
            _count: { id: true },
            _avg: { workingHours: true },
        });

        const workingDays = await prisma.schoolCalendar.count({
            where: {
                schoolId,
                date: {
                    gte: monthStart,
                    lte: monthEnd,
                },
                dayType: 'WORKING_DAY',
            },
        });

        const totalPresent = stats.find((s) => s.status === 'PRESENT')?._count.id || 0;
        const totalAbsent = stats.find((s) => s.status === 'ABSENT')?._count.id || 0;
        const totalHalfDay = stats.find((s) => s.status === 'HALF_DAY')?._count.id || 0;
        const totalLate = stats.find((s) => s.status === 'LATE')?._count.id || 0;
        const totalLeaves = stats.find((s) => s.status === 'ON_LEAVE')?._count.id || 0;
        const totalHolidays = stats.find((s) => s.status === 'HOLIDAY')?._count.id || 0;

        const attendancePercentage =
            workingDays > 0
                ? ((totalPresent + totalLate + totalHalfDay * 0.5) / workingDays) * 100
                : 0;

        const avgWorkingHours =
            stats.reduce((acc, s) => acc + (s._avg.workingHours || 0), 0) / (stats.length || 1);

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