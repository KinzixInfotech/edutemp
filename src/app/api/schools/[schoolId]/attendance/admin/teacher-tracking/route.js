import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const dateParam = searchParams.get('date');
    let today;

    if (dateParam) {
        const [year, month, day] = dateParam.split('-').map(Number);
        today = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    } else {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const year = istTime.getUTCFullYear();
        const month = istTime.getUTCMonth();
        const day = istTime.getUTCDate();
        today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }

    try {
        // STEP 1: Fetch ALL teaching staff (not just those with attendance records)
        const allTeachers = await prisma.user.findMany({
            where: {
                schoolId,
                role: { name: 'TEACHING_STAFF' },
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
                teacher: {
                    select: {
                        employeeId: true,
                        designation: true,
                        department: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // STEP 2: Fetch today's attendance for all teachers
        const todayAttendance = await prisma.attendance.findMany({
            where: {
                schoolId,
                date: today,
                userId: { in: allTeachers.map(t => t.id) }
            }
        });

        // Create a map for quick lookup
        const attendanceMap = new Map();
        todayAttendance.forEach(att => {
            attendanceMap.set(att.userId, att);
        });

        // STEP 3: Merge teachers with their attendance data
        const trackingData = await Promise.all(
            allTeachers.map(async (teacher) => {
                const att = attendanceMap.get(teacher.id);
                const streak = await calculateStreak(teacher.id, schoolId);

                // Parse location and device info if attendance exists
                const checkInLoc = att?.checkInLocation;
                const checkOutLoc = att?.checkOutLocation;
                const device = att?.deviceInfo || {};

                return {
                    userId: teacher.id,
                    name: teacher.name,
                    email: teacher.email,
                    profilePicture: teacher.profilePicture,
                    employeeId: teacher.teacher?.employeeId,
                    designation: teacher.teacher?.designation,
                    department: teacher.teacher?.department?.name,

                    // Attendance info (null if no attendance record)
                    status: att?.status || null,
                    checkInTime: att?.checkInTime || null,
                    checkOutTime: att?.checkOutTime || null,
                    workingHours: att?.workingHours || 0,
                    isLateCheckIn: att?.isLateCheckIn || false,
                    lateByMinutes: att?.lateByMinutes || 0,

                    // Location data
                    checkInLocation: checkInLoc ? {
                        latitude: checkInLoc.latitude,
                        longitude: checkInLoc.longitude,
                        accuracy: checkInLoc.accuracy,
                        address: checkInLoc.address || null
                    } : null,

                    checkOutLocation: checkOutLoc ? {
                        latitude: checkOutLoc.latitude,
                        longitude: checkOutLoc.longitude,
                        accuracy: checkOutLoc.accuracy,
                        address: checkOutLoc.address || null
                    } : null,

                    // Device info
                    deviceInfo: att ? {
                        deviceId: device.deviceId || 'Unknown',
                        platform: device.platform || 'Unknown',
                        osVersion: device.osVersion || 'Unknown',
                        appVersion: device.appVersion || 'Unknown'
                    } : null,

                    // Streak
                    streak,

                    // Additional
                    remarks: att?.remarks || null,
                    markedAt: att?.markedAt || null
                };
            })
        );

        // Calculate summary stats
        const checkedIn = trackingData.filter(t => t.checkInTime);
        const summary = {
            total: trackingData.length,
            checkedIn: checkedIn.length,
            notCheckedIn: trackingData.length - checkedIn.length,
            checkedOut: trackingData.filter(t => t.checkOutTime).length,
            late: trackingData.filter(t => t.isLateCheckIn).length,
            avgWorkingHours: checkedIn.length > 0
                ? (checkedIn.reduce((sum, t) => sum + t.workingHours, 0) / checkedIn.length).toFixed(2)
                : 0
        };

        // Get all locations for map view
        const locations = trackingData
            .filter(t => t.checkInLocation)
            .map(t => ({
                userId: t.userId,
                name: t.name,
                latitude: t.checkInLocation.latitude,
                longitude: t.checkInLocation.longitude,
                checkInTime: t.checkInTime,
                status: t.status
            }));

        return NextResponse.json({
            date: today.toISOString(),
            summary,
            teachers: trackingData,
            locations
        });

    } catch (error) {
        console.error('Teacher tracking error:', error);
        return NextResponse.json({
            error: 'Failed to fetch teacher tracking data',
            details: error.message
        }, { status: 500 });
    }
}

// Calculate consecutive attendance streak
async function calculateStreak(userId, schoolId) {
    try {
        const records = await prisma.attendance.findMany({
            where: {
                userId,
                schoolId,
                status: { in: ['PRESENT', 'LATE'] }
            },
            orderBy: { date: 'desc' },
            take: 100,
            select: { date: true }
        });

        if (records.length === 0) return 0;

        let streak = 0;
        let expectedDate = new Date();
        expectedDate.setHours(0, 0, 0, 0);

        for (const record of records) {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);

            if (recordDate.getTime() === expectedDate.getTime()) {
                streak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error('Streak calculation error:', error);
        return 0;
    }
}