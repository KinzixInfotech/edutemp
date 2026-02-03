// app/api/cron/biometric-finalize/route.js
// Night cron job to finalize biometric attendance with business rules
// Runs once daily (e.g., 6-8 PM IST)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCache, setCache, generateKey, invalidatePattern } from '@/lib/cache';

// Configuration
const CONFIG = {
    BATCH_SIZE: 100,
    PARALLEL_SCHOOLS: 3,
    CACHE_TTL: 3600,
};

// IST Timezone offset
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Get current IST date
const getCurrentISTDate = () => {
    const now = new Date();
    const istTime = new Date(now.getTime() + IST_OFFSET_MS);
    return new Date(istTime.toISOString().split('T')[0]);
};

// Format date for logging
const formatISTDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * GET - Main finalization endpoint (called by QStash cron nightly)
 */
export async function GET(request) {
    const startTime = Date.now();

    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Biometric Finalize] Starting nightly finalization...');

        const todayIST = getCurrentISTDate();

        // Get all schools with biometric enabled
        const schools = await prisma.school.findMany({
            where: {
                deletedAt: null,
                attendanceConfig: {
                    enableBiometricAttendance: true
                }
            },
            select: {
                id: true,
                name: true,
                attendanceConfig: {
                    select: {
                        defaultStartTime: true,
                        defaultEndTime: true,
                        gracePeriodMinutes: true,
                        halfDayHours: true,
                        fullDayHours: true,
                    }
                },
                AcademicYear: {
                    where: { isActive: true },
                    take: 1,
                    select: { id: true }
                }
            }
        });

        console.log(`[Biometric Finalize] Found ${schools.length} schools with biometric enabled`);

        if (schools.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No schools with biometric enabled',
                stats: { schoolsProcessed: 0 },
                executionTime: Date.now() - startTime,
            });
        }

        let totalFinalized = 0;
        let totalAbsentMarked = 0;
        let totalErrors = 0;
        const schoolResults = [];

        // Process schools in parallel batches
        for (let i = 0; i < schools.length; i += CONFIG.PARALLEL_SCHOOLS) {
            const batch = schools.slice(i, i + CONFIG.PARALLEL_SCHOOLS);

            const batchPromises = batch.map(async (school) => {
                try {
                    const result = await finalizeSchoolAttendance(school, todayIST);
                    totalFinalized += result.finalized;
                    totalAbsentMarked += result.absentMarked;
                    return {
                        schoolId: school.id,
                        schoolName: school.name,
                        ...result,
                    };
                } catch (error) {
                    console.error(`[Biometric Finalize] School ${school.id} error:`, error.message);
                    totalErrors++;
                    return {
                        schoolId: school.id,
                        schoolName: school.name,
                        error: error.message,
                    };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            batchResults.forEach((r) => {
                if (r.status === 'fulfilled') {
                    schoolResults.push(r.value);
                }
            });
        }

        // Invalidate attendance caches
        await invalidatePattern('attendance:*');

        const executionTime = Date.now() - startTime;
        console.log(`[Biometric Finalize] Completed in ${executionTime}ms - Finalized: ${totalFinalized}, Absent: ${totalAbsentMarked}`);

        return NextResponse.json({
            success: true,
            message: 'Biometric attendance finalization completed',
            stats: {
                schoolsProcessed: schools.length,
                totalFinalized,
                totalAbsentMarked,
                totalErrors,
                executionTime,
            },
            schools: schoolResults,
            date: formatISTDate(todayIST),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Biometric Finalize] Critical error:', error);
        return NextResponse.json(
            {
                error: 'Biometric finalization failed',
                message: error.message,
                executionTime: Date.now() - startTime,
            },
            { status: 500 }
        );
    }
}

/**
 * Finalize attendance for a single school
 */
async function finalizeSchoolAttendance(school, date) {
    const config = school.attendanceConfig;
    const academicYearId = school.AcademicYear[0]?.id;

    if (!academicYearId) {
        console.log(`[School ${school.id}] No active academic year, skipping`);
        return { finalized: 0, absentMarked: 0, skipped: true };
    }

    // Get all unfinalized biometric attendance records for today
    const unfinalizedRecords = await prisma.attendance.findMany({
        where: {
            schoolId: school.id,
            date: date,
            isBiometricEntry: true,
            isBiometricFinalized: false,
        },
    });

    console.log(`[School ${school.id}] Found ${unfinalizedRecords.length} unfinalized records`);

    let finalized = 0;

    // Finalize each record with business rules
    for (const record of unfinalizedRecords) {
        try {
            const updates = calculateFinalStatus(record, config);

            await prisma.attendance.update({
                where: { id: record.id },
                data: {
                    ...updates,
                    isBiometricFinalized: true,
                    biometricFinalizedAt: new Date(),
                    remarks: 'Biometric attendance (finalized)',
                },
            });

            finalized++;
        } catch (error) {
            console.error(`[School ${school.id}] Error finalizing ${record.id}:`, error.message);
        }
    }

    // Mark absent for users who have no attendance today but are mapped to biometric
    const absentMarked = await markAbsentForMissingUsers(school.id, date, academicYearId);

    return { finalized, absentMarked };
}

/**
 * Calculate final attendance status based on business rules
 */
function calculateFinalStatus(record, config) {
    const updates = {};

    if (!record.checkInTime) {
        return updates; // No check-in, already marked present somehow
    }

    const checkInTime = new Date(record.checkInTime);
    const checkInIST = new Date(checkInTime.getTime() + IST_OFFSET_MS);

    // Parse config times
    const startTime = config?.defaultStartTime || '09:00';
    const [startHour, startMin] = startTime.split(':').map(Number);
    const gracePeriod = config?.gracePeriodMinutes || 15;
    const halfDayHours = config?.halfDayHours || 4;
    const fullDayHours = config?.fullDayHours || 8;

    // Calculate scheduled start time
    const eventDate = new Date(record.date);
    const scheduledStart = new Date(eventDate);
    scheduledStart.setUTCHours(startHour, startMin, 0, 0);

    // Check if late
    const lateThreshold = new Date(scheduledStart.getTime() + gracePeriod * 60 * 1000);
    const checkInTimeOnly = new Date(eventDate);
    checkInTimeOnly.setUTCHours(checkInIST.getUTCHours(), checkInIST.getUTCMinutes(), 0, 0);

    const isLate = checkInTimeOnly > lateThreshold;
    const lateByMinutes = isLate
        ? Math.floor((checkInTimeOnly - scheduledStart) / (60 * 1000))
        : 0;

    updates.isLateCheckIn = isLate;
    updates.lateByMinutes = lateByMinutes;

    // Check working hours for half-day
    const workingHours = record.workingHours || 0;

    if (workingHours < halfDayHours && workingHours > 0) {
        updates.status = 'HALF_DAY';
    } else if (isLate && lateByMinutes > gracePeriod * 2) {
        // Very late (more than 2x grace period) might be half-day
        updates.status = 'LATE';
    } else {
        updates.status = 'PRESENT';
    }

    return updates;
}

/**
 * Mark absent for users who have biometric mapping but no attendance today
 */
async function markAbsentForMissingUsers(schoolId, date, academicYearId) {
    // Get all users who are mapped to biometric devices
    const mappedUsers = await prisma.biometricIdentityMap.findMany({
        where: {
            device: {
                schoolId: schoolId,
                isEnabled: true,
            },
            isActive: true,
        },
        select: { userId: true },
    });

    if (mappedUsers.length === 0) return 0;

    const mappedUserIds = mappedUsers.map(m => m.userId);

    // Get users who already have attendance for today
    const existingAttendance = await prisma.attendance.findMany({
        where: {
            schoolId,
            date,
            userId: { in: mappedUserIds },
        },
        select: { userId: true },
    });

    const attendanceUserIds = new Set(existingAttendance.map(a => a.userId));
    const missingUserIds = mappedUserIds.filter(id => !attendanceUserIds.has(id));

    if (missingUserIds.length === 0) return 0;

    console.log(`[School ${schoolId}] Marking ${missingUserIds.length} users as absent`);

    // Create absent records in batches
    let absentMarked = 0;
    for (let i = 0; i < missingUserIds.length; i += CONFIG.BATCH_SIZE) {
        const batch = missingUserIds.slice(i, i + CONFIG.BATCH_SIZE);

        try {
            const result = await prisma.attendance.createMany({
                data: batch.map(userId => ({
                    userId,
                    schoolId,
                    date,
                    status: 'ABSENT',
                    markedAt: new Date(),
                    remarks: 'Auto-marked absent (biometric - no punch)',
                    requiresApproval: false,
                    approvalStatus: 'NOT_REQUIRED',
                    isBiometricEntry: true,
                    isBiometricFinalized: true,
                    biometricFinalizedAt: new Date(),
                })),
                skipDuplicates: true,
            });
            absentMarked += result.count;
        } catch (error) {
            console.error(`[School ${schoolId}] Error marking batch absent:`, error.message);
        }
    }

    return absentMarked;
}
