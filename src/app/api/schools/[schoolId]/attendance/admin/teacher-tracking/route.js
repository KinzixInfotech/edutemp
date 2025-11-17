// // app/api/schools/[schoolId]/attendance/admin/teacher-tracking/route.js
// import prisma from '@/lib/prisma';
// import { NextResponse } from 'next/server';

// export async function GET(req, { params }) {
//     const { schoolId } = params;
//     const { searchParams } = new URL(req.url);

//     const dateParam = searchParams.get('date');
//     let today;

//     if (dateParam) {
//         // Parse YYYY-MM-DD correctly
//         const [year, month, day] = dateParam.split('-').map(Number);
//         today = new Date(year, month - 1, day);
//     } else {
//         today = new Date();
//     }

//     const teacherId = searchParams.get('teacherId');

//     try {

//         // Build where clause
//         const where = {
//             schoolId,
//             date: today,
//             user: {
//                 role: { name: 'TEACHING_STAFF' }
//             },
//             ...(teacherId && { userId: teacherId })
//         };
//         // Fetch all teacher attendance with device and location info
//         const teacherAttendance = await prisma.attendance.findMany({
//             where,
//             include: {
//                 user: {
//                     select: {
//                         id: true,
//                         name: true,
//                         email: true,
//                         profilePicture: true,
//                         teacher: {
//                             select: {
//                                 employeeId: true,
//                                 designation: true,
//                                 department: {
//                                     select: { name: true }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             },
//             orderBy: [
//                 { status: 'asc' },
//                 { checkInTime: 'asc' }
//             ]
//         });

//         // Calculate streaks and format data
//         const trackingData = await Promise.all(
//             teacherAttendance.map(async (att) => {
//                 const streak = await calculateStreak(att.userId, schoolId);

//                 // Parse location data
//                 const checkInLoc = att.checkInLocation;
//                 const checkOutLoc = att.checkOutLocation;

//                 // Parse device info
//                 const device = att.deviceInfo || {};

//                 return {
//                     userId: att.user.id,
//                     name: att.user.name,
//                     email: att.user.email,
//                     profilePicture: att.user.profilePicture,
//                     employeeId: att.user.teacher?.employeeId,
//                     designation: att.user.teacher?.designation,
//                     department: att.user.teacher?.department?.name,

//                     // Attendance info
//                     status: att.status,
//                     checkInTime: att.checkInTime,
//                     checkOutTime: att.checkOutTime,
//                     workingHours: att.workingHours || 0,
//                     isLateCheckIn: att.isLateCheckIn,
//                     lateByMinutes: att.lateByMinutes,

//                     // Location data
//                     checkInLocation: checkInLoc ? {
//                         latitude: checkInLoc.latitude,
//                         longitude: checkInLoc.longitude,
//                         accuracy: checkInLoc.accuracy,
//                         address: checkInLoc.address || null
//                     } : null,

//                     checkOutLocation: checkOutLoc ? {
//                         latitude: checkOutLoc.latitude,
//                         longitude: checkOutLoc.longitude,
//                         accuracy: checkOutLoc.accuracy,
//                         address: checkOutLoc.address || null
//                     } : null,

//                     // Device info
//                     deviceInfo: {
//                         deviceId: device.deviceId || 'Unknown',
//                         platform: device.platform || 'Unknown',
//                         osVersion: device.osVersion || 'Unknown',
//                         appVersion: device.appVersion || 'Unknown'
//                     },

//                     // Streak
//                     consecutiveDays: streak,

//                     // Additional
//                     remarks: att.remarks,
//                     markedAt: att.markedAt
//                 };
//             })
//         );

//         // Calculate summary stats
//         const summary = {
//             total: trackingData.length,
//             checkedIn: trackingData.filter(t => t.checkInTime).length,
//             checkedOut: trackingData.filter(t => t.checkOutTime).length,
//             late: trackingData.filter(t => t.isLateCheckIn).length,
//             avgWorkingHours: trackingData.length > 0
//                 ? (trackingData.reduce((sum, t) => sum + t.workingHours, 0) / trackingData.length).toFixed(2)
//                 : 0
//         };

//         // Get all locations for map view
//         const locations = trackingData
//             .filter(t => t.checkInLocation)
//             .map(t => ({
//                 userId: t.userId,
//                 name: t.name,
//                 latitude: t.checkInLocation.latitude,
//                 longitude: t.checkInLocation.longitude,
//                 checkInTime: t.checkInTime,
//                 status: t.status
//             }));

//         return NextResponse.json({
//             date: today.toISOString(),
//             summary,
//             teachers: trackingData,
//             locations
//         });

//     } catch (error) {
//         console.error('Teacher tracking error:', error);
//         return NextResponse.json({
//             error: 'Failed to fetch teacher tracking data',
//             details: error.message
//         }, { status: 500 });
//     }
// }

// // Calculate consecutive attendance streak
// async function calculateStreak(userId, schoolId) {
//     try {
//         const records = await prisma.attendance.findMany({
//             where: {
//                 userId,
//                 schoolId,
//                 status: { in: ['PRESENT', 'LATE'] }
//             },
//             orderBy: { date: 'desc' },
//             take: 100,
//             select: { date: true }
//         });

//         if (records.length === 0) return 0;

//         let streak = 0;
//         let expectedDate = new Date();
//         expectedDate.setHours(0, 0, 0, 0);

//         for (const record of records) {
//             const recordDate = new Date(record.date);
//             recordDate.setHours(0, 0, 0, 0);

//             if (recordDate.getTime() === expectedDate.getTime()) {
//                 streak++;
//                 expectedDate.setDate(expectedDate.getDate() - 1);
//             } else {
//                 break;
//             }
//         }

//         return streak;
//     } catch (error) {
//         console.error('Streak calculation error:', error);
//         return 0;
//     }
// }
// app/api/schools/[schoolId]/attendance/admin/teacher-tracking/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    const { schoolId } = await params; // Fix: await params
    const { searchParams } = new URL(req.url);

    const dateParam = searchParams.get('date');
    let today;

    if (dateParam) {
        // Parse YYYY-MM-DD and store as UTC midnight
        const [year, month, day] = dateParam.split('-').map(Number);
        today = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)); // Use UTC!
    } else {
        // Get current date in IST, then convert to UTC midnight
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const year = istTime.getUTCFullYear();
        const month = istTime.getUTCMonth();
        const day = istTime.getUTCDate();
        today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }

    const teacherId = searchParams.get('teacherId');

    try {
        console.log('Querying date:', today.toISOString()); // Debug log

        // Build where clause
        const where = {
            schoolId,
            date: today,
            user: {
                role: { name: 'TEACHING_STAFF' }
            },
            ...(teacherId && { userId: teacherId })
        };

        // Fetch all teacher attendance with device and location info
        const teacherAttendance = await prisma.attendance.findMany({
            where,
            include: {
                user: {
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
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { checkInTime: 'asc' }
            ]
        });

        console.log('Found records:', teacherAttendance.length); // Debug log

        // Calculate streaks and format data
        const trackingData = await Promise.all(
            teacherAttendance.map(async (att) => {
                const streak = await calculateStreak(att.userId, schoolId);

                // Parse location data
                const checkInLoc = att.checkInLocation;
                const checkOutLoc = att.checkOutLocation;

                // Parse device info
                const device = att.deviceInfo || {};

                return {
                    userId: att.user.id,
                    name: att.user.name,
                    email: att.user.email,
                    profilePicture: att.user.profilePicture,
                    employeeId: att.user.teacher?.employeeId,
                    designation: att.user.teacher?.designation,
                    department: att.user.teacher?.department?.name,

                    // Attendance info
                    status: att.status,
                    checkInTime: att.checkInTime,
                    checkOutTime: att.checkOutTime,
                    workingHours: att.workingHours || 0,
                    isLateCheckIn: att.isLateCheckIn,
                    lateByMinutes: att.lateByMinutes,

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
                    deviceInfo: {
                        deviceId: device.deviceId || 'Unknown',
                        platform: device.platform || 'Unknown',
                        osVersion: device.osVersion || 'Unknown',
                        appVersion: device.appVersion || 'Unknown'
                    },

                    // Streak
                    consecutiveDays: streak,

                    // Additional
                    remarks: att.remarks,
                    markedAt: att.markedAt
                };
            })
        );

        // Calculate summary stats
        const summary = {
            total: trackingData.length,
            checkedIn: trackingData.filter(t => t.checkInTime).length,
            checkedOut: trackingData.filter(t => t.checkOutTime).length,
            late: trackingData.filter(t => t.isLateCheckIn).length,
            avgWorkingHours: trackingData.length > 0
                ? (trackingData.reduce((sum, t) => sum + t.workingHours, 0) / trackingData.length).toFixed(2)
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