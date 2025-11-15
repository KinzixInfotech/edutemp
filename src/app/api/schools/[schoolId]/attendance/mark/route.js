// app/api/schools/[schoolId]/attendance/mark/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ──────────────────────────────────────────────────────────────────────
// DEFAULT CONFIG (auto-created if missing)
// ──────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
    defaultStartTime: '09:00',
    defaultEndTime: '22:00',
    gracePeriodMinutes: 15,
    enableGeoFencing: false,
    allowedRadiusMeters: 500,
    halfDayHours: 4,
    fullDayHours: 8,
};

// ──────────────────────────────────────────────────────────────────────
// CHECK-OUT GRACE: 3 hours after school end
// ──────────────────────────────────────────────────────────────────────
const CHECK_OUT_GRACE_HOURS = 3;

// ──────────────────────────────────────────────────────────────────────
// POST – Mark Check-in / Check-out
// ──────────────────────────────────────────────────────────────────────
export async function POST(req, { params }) {
    const { schoolId } = params;
    const body = await req.json();
    const { userId, type, location, deviceInfo, remarks } = body;

    if (!userId || !type || !['CHECK_IN', 'CHECK_OUT'].includes(type)) {
        return NextResponse.json({ error: 'userId and valid type required' }, { status: 400 });
    }

    try {
        const now = new Date();
        const today = new Date(now.toDateString());

        // ───── 1. Fetch config + calendar ─────
        const [config, calendar] = await Promise.all([
            prisma.attendanceConfig.findUnique({ where: { schoolId } }),
            prisma.schoolCalendar.findUnique({
                where: { schoolId_date: { schoolId, date: today } },
            }),
        ]);

        if (!config) {
            return NextResponse.json({ error: 'Attendance config not found' }, { status: 404 });
        }

        if (calendar?.dayType !== 'WORKING_DAY') {
            return NextResponse.json(
                { error: `Today is ${calendar?.dayType || 'HOLIDAY'}`, dayType: calendar?.dayType },
                { status: 400 }
            );
        }

        // ───── 2. Geofencing ─────
        if (config.enableGeoFencing && location) {
            const distance = calculateDistance(
                location.latitude,
                location.longitude,
                config.schoolLatitude,
                config.schoolLongitude
            );
            if (distance > config.allowedRadiusMeters) {
                return NextResponse.json(
                    {
                        error: `Too far: ${Math.round(distance)}m. Must be within ${config.allowedRadiusMeters}m.`,
                        distance,
                        allowedRadius: config.allowedRadiusMeters,
                    },
                    { status: 400 }
                );
            }
        }

        // ───── 3. Parse school times ─────
        const [startH, startM] = config.defaultStartTime.split(':').map(Number);
        const [endH, endM] = config.defaultEndTime.split(':').map(Number);

        const schoolStart = new Date(today);
        schoolStart.setHours(startH, startM, 0, 0);

        const schoolEnd = new Date(today);
        schoolEnd.setHours(endH, endM, 0, 0);

        // ───── 4. Transaction ─────
        return await prisma.$transaction(async (tx) => {
            // ────────────────────────
            // CHECK_IN
            // ────────────────────────
            if (type === 'CHECK_IN') {
                const existing = await tx.attendance.findUnique({
                    where: { userId_schoolId_date: { userId, schoolId, date: today } },
                });

                if (existing?.checkInTime) {
                    return { success: false, message: 'Already checked in', attendance: existing };
                }

                if (now < schoolStart) {
                    return {
                        success: false,
                        message: `Check-in opens at ${config.defaultStartTime}`,
                        opensAt: schoolStart.toISOString(),
                    };
                }
                if (now > schoolEnd) {
                    return {
                        success: false,
                        message: `Check-in closed at ${config.defaultEndTime}`,
                        closesAt: schoolEnd.toISOString(),
                    };
                }

                const grace = new Date(schoolStart);
                grace.setMinutes(grace.getMinutes() + config.gracePeriodMinutes);
                const isLate = now > grace;
                const lateByMinutes = isLate ? Math.floor((now - grace) / 60000) : null;

                const data = {
                    status: isLate ? 'LATE' : 'PRESENT',
                    checkInTime: now,
                    isLateCheckIn: isLate,
                    lateByMinutes,
                    checkInLocation: location || null,
                    deviceInfo: deviceInfo || null,
                    remarks,
                    markedBy: userId,
                    requiresApproval: false,
                    approvalStatus: 'NOT_REQUIRED',
                    workingHours: 0, // ← reset on new check-in
                };

                let attendance;
                if (existing) {
                    attendance = await tx.attendance.update({ where: { id: existing.id }, data });
                } else {
                    attendance = await tx.attendance.create({
                        data: { userId, schoolId, date: today, ...data },
                    });
                }

                return {
                    success: true,
                    message: isLate ? `Checked in (Late by ${lateByMinutes} min)` : 'Checked in',
                    attendance,
                    isLate,
                };
            }

            // ────────────────────────
            // CHECK_OUT
            // ────────────────────────
            if (type === 'CHECK_OUT') {
                const attendance = await tx.attendance.findUnique({
                    where: { userId_schoolId_date: { userId, schoolId, date: today } },
                });

                if (!attendance?.checkInTime) {
                    return { success: false, message: 'No check-in record' };
                }
                if (attendance.checkOutTime) {
                    return { success: false, message: 'Already checked out', attendance };
                }

                const checkInTime = new Date(attendance.checkInTime);

                // Check-out window: schoolEnd → schoolEnd + 3h
                const checkOutStart = new Date(schoolEnd);
                const checkOutDeadline = new Date(schoolEnd);
                checkOutDeadline.setHours(checkOutDeadline.getHours() + CHECK_OUT_GRACE_HOURS);

                if (now < checkOutStart) {
                    return {
                        success: false,
                        message: `Check-out opens at ${config.defaultEndTime}`,
                        opensAt: checkOutStart.toISOString(),
                    };
                }
                if (now > checkOutDeadline) {
                    return {
                        success: false,
                        message: `Check-out closed at ${checkOutDeadline.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}`,
                        deadline: checkOutDeadline.toISOString(),
                    };
                }

                // Minimum working hours
                // In CHECK_OUT block
                const minCheckOut = new Date(checkInTime);
                minCheckOut.setHours(minCheckOut.getHours() + config.halfDayHours);

                if (now < minCheckOut) {
                    const timeStr = minCheckOut.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return {
                        success: false,
                        message: `Need ${config.halfDayHours}h. Can check out after ${timeStr}`,
                        minTime: minCheckOut.toISOString(), // For frontend if needed
                    };
                }
                // FINAL: Calculate and SAVE working hours
                const workingHoursRaw = (now - checkInTime) / (1000 * 60 * 60);
                const workingHours = Number(workingHoursRaw.toFixed(2));


                let status = 'PRESENT';
                if (workingHours < config.halfDayHours) status = 'HALF_DAY';
                else if (workingHours < (config.fullDayHours || 8)) status = 'PRESENT';
                const updated = await tx.attendance.update({
                    where: { id: attendance.id },
                    data: {
                        checkOutTime: now,
                        checkOutLocation: location || null,
                        workingHours,  // ← SAVED
                        status,
                        remarks: remarks || attendance.remarks,
                    },
                });
                console.log(workingHours, updated.workingHours);
                return {
                    success: true,
                    message: 'Checked out',
                    attendance: updated,
                    workingHours: updated.workingHours,
                };
            }
        })
            .then((result) => NextResponse.json(result))
            .catch((err) => {
                console.error('Transaction error:', err);
                return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
            });
    } catch (error) {
        console.error('Mark attendance error:', error);
        return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────────────────────────
// GET – Today’s status + LIVE working hours
// ──────────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
    const { schoolId } = params;
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    try {
        const today = new Date(new Date().toDateString());
        const now = new Date();
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();

        // Auto-create config
        let config = await prisma.attendanceConfig.findUnique({ where: { schoolId } });
        if (!config) {
            config = await prisma.attendanceConfig.create({
                data: { schoolId, ...DEFAULT_CONFIG },
            });
        }

        const [attendance, calendar, monthlyStats] = await Promise.all([
            prisma.attendance.findUnique({
                where: { userId_schoolId_date: { userId, schoolId, date: today } },
            }),
            prisma.schoolCalendar.findUnique({
                where: { schoolId_date: { schoolId, date: today } },
            }),
            getMonthlyStats(userId, schoolId, month, year),
        ]);

        // ── LIVE working hours (for UI timer) ──
        let liveWorkingHours = 0;
        if (attendance?.checkInTime && !attendance?.checkOutTime) {
            const checkInTime = new Date(attendance.checkInTime);
            const diffHours = (now - checkInTime) / (1000 * 60 * 60);
            liveWorkingHours = Number(diffHours.toFixed(2));
        }

        const finalWorkingHours = attendance?.checkOutTime
            ? (attendance.workingHours ?? 0)
            : liveWorkingHours;

        return NextResponse.json({
            attendance: {
                ...attendance,
                workingHours: finalWorkingHours,
                liveWorkingHours: attendance?.checkOutTime ? null : liveWorkingHours,
            },
            isWorkingDay: calendar?.dayType === 'WORKING_DAY',
            dayType: calendar?.dayType,
            holidayName: calendar?.holidayName,
            config: {
                startTime: config.defaultStartTime,
                endTime: config.defaultEndTime,
                gracePeriod: config.gracePeriodMinutes,
                enableGeoFencing: config.enableGeoFencing,
                allowedRadius: config.allowedRadiusMeters,
            },
            monthlyStats,
        });
    } catch (e) {
        console.error('GET error:', e);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────────────────────────
// Monthly Stats Helper
// ──────────────────────────────────────────────────────────────────────
async function getMonthlyStats(userId, schoolId, month, year) {
    let stats = await prisma.attendanceStats.findFirst({
        where: { userId, schoolId, month, year },
    });

    if (!stats) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const [records, workingDays] = await Promise.all([
            prisma.attendance.findMany({
                where: { userId, schoolId, date: { gte: startDate, lte: endDate } },
            }),
            prisma.schoolCalendar.count({
                where: { schoolId, date: { gte: startDate, lte: endDate }, dayType: 'WORKING_DAY' },
            }),
        ]);

        const present = records.filter((r) => ['PRESENT', 'LATE'].includes(r.status)).length;
        const absent = records.filter((r) => r.status === 'ABSENT').length;
        const late = records.filter((r) => r.status === 'LATE').length;
        const leaves = records.filter((r) => r.status === 'ON_LEAVE').length;

        const totalWorking = workingDays || records.length;
        const percentage = totalWorking > 0 ? ((present / totalWorking) * 100).toFixed(1) : 0;

        stats = {
            totalWorkingDays: totalWorking,
            totalPresent: present,
            totalAbsent: absent,
            totalLate: late,
            totalLeaves: leaves,
            attendancePercentage: parseFloat(percentage),
        };
    }

    return {
        totalDays: stats.totalWorkingDays,
        presentDays: stats.totalPresent,
        absentDays: stats.totalAbsent,
        lateDays: stats.totalLate,
        leaveDays: stats.totalLeaves,
        attendancePercentage: stats.attendancePercentage,
    };
}

// ──────────────────────────────────────────────────────────────────────
// Distance Helper
// ──────────────────────────────────────────────────────────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}