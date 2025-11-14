// app/api/schools/[schoolId]/attendance/mark/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// === CONFIG ===
const CHECK_IN_WINDOW_HOURS = 3; // Max 3 hours after school start
const CHECK_OUT_WINDOW_HOURS = 3; // Max 3 hours after check-in

// POST - Mark self attendance
export async function POST(req, { params }) {
    const { schoolId } = params;
    const body = await req.json();
    const {
        userId,
        type, // 'CHECK_IN' or 'CHECK_OUT'
        location,
        deviceInfo,
        remarks
    } = body;

    if (!userId || !type) {
        return NextResponse.json({ error: 'userId and type are required' }, { status: 400 });
    }

    try {
        const now = new Date();
        const today = new Date(now.toDateString());

        // === 1. Get config & calendar ===
        const [config, calendar] = await Promise.all([
            prisma.attendanceConfig.findUnique({ where: { schoolId } }),
            prisma.schoolCalendar.findUnique({
                where: { schoolId_date: { schoolId, date: today } }
            })
        ]);

        if (!config) {
            return NextResponse.json({ error: 'Attendance config not found' }, { status: 404 });
        }

        if (calendar?.dayType !== 'WORKING_DAY') {
            return NextResponse.json({
                error: `Today is ${calendar?.dayType || 'HOLIDAY'}`,
                dayType: calendar?.dayType
            }, { status: 400 });
        }

        // === 2. Geofencing ===
        if (config.enableGeoFencing && location) {
            const distance = calculateDistance(
                location.latitude,
                location.longitude,
                config.schoolLatitude,
                config.schoolLongitude
            );
            if (distance > config.allowedRadiusMeters) {
                return NextResponse.json({
                    error: `Too far: ${Math.round(distance)}m. Must be within ${config.allowedRadiusMeters}m.`,
                    distance,
                    allowedRadius: config.allowedRadiusMeters
                }, { status: 400 });
            }
        }

        // === 3. Parse school start time ===
        const [startHour, startMinute] = config.defaultStartTime.split(':').map(Number);
        const schoolStart = new Date(today);
        schoolStart.setHours(startHour, startMinute, 0, 0);

        const checkInDeadline = new Date(schoolStart);
        checkInDeadline.setHours(checkInDeadline.getHours() + CHECK_IN_WINDOW_HOURS);

        // === 4. Transaction ===
        return await prisma.$transaction(async (tx) => {
            if (type === 'CHECK_IN') {
                const existing = await tx.attendance.findUnique({
                    where: { userId_schoolId_date: { userId, schoolId, date: today } }
                });

                // Already checked in?
                if (existing?.checkInTime) {
                    return {
                        success: false,
                        message: 'Already checked in today',
                        attendance: existing
                    };
                }

                // Outside check-in window?
                if (now > checkInDeadline) {
                    return {
                        success: false,
                        message: `Check-in window closed. School starts at ${config.defaultStartTime}, you had until ${checkInDeadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
                        deadline: checkInDeadline.toISOString()
                    };
                }

                // Calculate late
                const graceTime = new Date(schoolStart);
                graceTime.setMinutes(graceTime.getMinutes() + config.gracePeriodMinutes);

                const isLate = now > graceTime;
                const lateByMinutes = isLate ? Math.floor((now - graceTime) / 60000) : null;

                // Update ABSENT or create new
                if (existing && !existing.checkInTime) {
                    const updated = await tx.attendance.update({
                        where: { id: existing.id },
                        data: {
                            status: isLate ? 'LATE' : 'PRESENT',
                            checkInTime: now,
                            isLateCheckIn: isLate,
                            lateByMinutes,
                            checkInLocation: location || null,
                            deviceInfo: deviceInfo || null,
                            remarks,
                            markedBy: userId,
                            requiresApproval: false,
                            approvalStatus: 'NOT_REQUIRED'
                        }
                    });
                    return {
                        success: true,
                        message: isLate ? `Checked in (Late by ${lateByMinutes} min)` : 'Checked in',
                        attendance: updated,
                        isLate
                    };
                }

                // Create new
                const attendance = await tx.attendance.create({
                    data: {
                        userId,
                        schoolId,
                        date: today,
                        status: isLate ? 'LATE' : 'PRESENT',
                        checkInTime: now,
                        isLateCheckIn: isLate,
                        lateByMinutes,
                        checkInLocation: location || null,
                        deviceInfo: deviceInfo || null,
                        remarks,
                        markedBy: userId,
                        requiresApproval: false,
                        approvalStatus: 'NOT_REQUIRED'
                    }
                });

                return {
                    success: true,
                    message: isLate ? `Checked in (Late by ${lateByMinutes} min)` : 'Checked in',
                    attendance,
                    isLate
                };

            } else if (type === 'CHECK_OUT') {
                const attendance = await tx.attendance.findUnique({
                    where: { userId_schoolId_date: { userId, schoolId, date: today } }
                });

                if (!attendance || !attendance.checkInTime) {
                    return { success: false, message: 'No check-in record found' };
                }

                if (attendance.checkOutTime) {
                    return { success: false, message: 'Already checked out', attendance };
                }

                // Check-out window: 3 hours after check-in
                const checkInTime = new Date(attendance.checkInTime);
                const checkOutDeadline = new Date(checkInTime);
                checkOutDeadline.setHours(checkOutDeadline.getHours() + CHECK_OUT_WINDOW_HOURS);

                if (now > checkOutDeadline) {
                    return {
                        success: false,
                        message: `Check-out window closed. You had 3 hours after check-in (${checkInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}).`,
                        deadline: checkOutDeadline.toISOString()
                    };
                }

                const workingHours = (now - checkInTime) / (1000 * 60 * 60);
                let status = attendance.status;

                if (workingHours < config.halfDayHours) {
                    status = 'HALF_DAY';
                }

                const updated = await tx.attendance.update({
                    where: { id: attendance.id },
                    data: {
                        checkOutTime: now,
                        checkOutLocation: location || null,
                        workingHours,
                        status,
                        remarks: remarks || attendance.remarks
                    }
                });

                return {
                    success: true,
                    message: 'Checked out',
                    attendance: updated,
                    workingHours
                };
            }
        }).then(result => NextResponse.json(result))
            .catch(err => {
                console.error('Transaction failed:', err);
                return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
            });

    } catch (error) {
        console.error('Mark attendance error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}

// === GET - Today's status (unchanged) ===

// === DEFAULT CONFIG (used if missing) ===
const DEFAULT_CONFIG = {
    defaultStartTime: '09:00',
    defaultEndTime: '22:00',
    gracePeriodMinutes: 15,
    enableGeoFencing: false,
    allowedRadiusMeters: 500,
    halfDayHours: 4,
};

// GET - Get today's attendance status
export async function GET(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    try {
        const today = new Date(new Date().toDateString());
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // === 1. Auto-create config if missing ===
        let config = await prisma.attendanceConfig.findUnique({
            where: { schoolId }
        });

        if (!config) {
            console.log('Warning: Attendance config missing. Auto-creating...');
            config = await prisma.attendanceConfig.create({
                data: {
                    schoolId,
                    ...DEFAULT_CONFIG
                }
            });
            console.log('Attendance config auto-created');
        }

        // === 2. Fetch all data in parallel ===
        const [attendance, calendar, monthlyStats] = await Promise.all([
            prisma.attendance.findUnique({
                where: {
                    userId_schoolId_date: { userId, schoolId, date: today }
                }
            }),
            prisma.schoolCalendar.findUnique({
                where: { schoolId_date: { schoolId, date: today } }
            }),
            getMonthlyStats(userId, schoolId, currentMonth, currentYear)
        ]);

        const isWorkingDay = calendar?.dayType === 'WORKING_DAY';

        return NextResponse.json({
            attendance,
            isWorkingDay,
            dayType: calendar?.dayType,
            holidayName: calendar?.holidayName,
            config: {
                startTime: config.defaultStartTime,
                endTime: config.defaultEndTime,
                gracePeriod: config.gracePeriodMinutes,
                enableGeoFencing: config.enableGeoFencing,
                allowedRadius: config.allowedRadiusMeters
            },
            monthlyStats
        });

    } catch (error) {
        console.error('Fetch attendance error:', error);
        return NextResponse.json({ error: 'Failed to fet`ch' }, { status: 500 });
    }
}

// === Monthly Stats Helper ===
async function getMonthlyStats(userId, schoolId, month, year) {
    let stats = await prisma.attendanceStats.findFirst({
        where: { userId, schoolId, month, year }
    });

    if (!stats) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const [records, workingDays] = await Promise.all([
            prisma.attendance.findMany({
                where: { userId, schoolId, date: { gte: startDate, lte: endDate } }
            }),
            prisma.schoolCalendar.count({
                where: { schoolId, date: { gte: startDate, lte: endDate }, dayType: 'WORKING_DAY' }
            })
        ]);

        const present = records.filter(r => ['PRESENT', 'LATE'].includes(r.status)).length;
        const absent = records.filter(r => r.status === 'ABSENT').length;
        const late = records.filter(r => r.status === 'LATE').length;
        const leaves = records.filter(r => r.status === 'ON_LEAVE').length;

        const totalWorking = workingDays || records.length;
        const percentage = totalWorking > 0 ? ((present / totalWorking) * 100).toFixed(1) : 0;

        stats = {
            totalWorkingDays: totalWorking,
            totalPresent: present,
            totalAbsent: absent,
            totalLate: late,
            totalLeaves: leaves,
            attendancePercentage: parseFloat(percentage)
        };
    }

    return {
        totalDays: stats.totalWorkingDays,
        presentDays: stats.totalPresent,
        absentDays: stats.totalAbsent,
        lateDays: stats.totalLate,
        leaveDays: stats.totalLeaves,
        attendancePercentage: stats.attendancePercentage
    };
}

// === POST, PUT, etc. remain unchanged ===
// (Keep your existing POST, PUT, and distance helper)

// === Distance Helper ===
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}