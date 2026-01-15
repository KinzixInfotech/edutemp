import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

// ──────────────────────────────────────────────────────────────────────
// CONFIGURATION CONSTANTS (Fallback defaults)
// ──────────────────────────────────────────────────────────────────────
const DEFAULT_CHECK_IN_WINDOW_HOURS = 2;
const DEFAULT_CHECK_OUT_GRACE_HOURS = 4;
const DEFAULT_MIN_WORKING_HOURS = 4;

// India Standard Time offset (UTC+5:30)
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

// ──────────────────────────────────────────────────────────────────────
// HELPER: Get IST date (handles timezone properly)
// ──────────────────────────────────────────────────────────────────────
function getISTDate() {
    const now = new Date();
    const istTime = new Date(now.getTime() + IST_OFFSET);
    const year = istTime.getUTCFullYear();
    const month = istTime.getUTCMonth();
    const date = istTime.getUTCDate();
    return new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
}

function getISTNow() {
    const now = new Date();
    return new Date(now.getTime() + IST_OFFSET);
}

// ──────────────────────────────────────────────────────────────────────
// POST – Mark Check-in / Check-out
// ──────────────────────────────────────────────────────────────────────
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { userId, type, location, deviceInfo, remarks } = body;

    // Extract IP Address for tracking
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'Unknown';
    const enrichedDeviceInfo = {
        ...deviceInfo,
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || deviceInfo?.userAgent
    };

    if (!userId || !type || !['CHECK_IN', 'CHECK_OUT'].includes(type)) {
        return NextResponse.json({
            error: 'userId and valid type (CHECK_IN/CHECK_OUT) required'
        }, { status: 400 });
    }

    try {
        const now = new Date();
        const today = getISTDate();

        // ───── 1. Fetch config + calendar ─────
        const [config, calendar] = await Promise.all([
            prisma.attendanceConfig.findUnique({ where: { schoolId } }),
            prisma.schoolCalendar.findUnique({
                where: { schoolId_date: { schoolId, date: today } },
            }),
        ]);

        if (!config) {
            return NextResponse.json({
                error: 'Attendance config not found. Please set up calendar first.'
            }, { status: 404 });
        }

        // Get dynamic values from config or use defaults
        const CHECK_IN_WINDOW_HOURS = config.checkInWindowHours ?? DEFAULT_CHECK_IN_WINDOW_HOURS;
        const CHECK_OUT_GRACE_HOURS = config.checkOutGraceHours ?? DEFAULT_CHECK_OUT_GRACE_HOURS;
        const MIN_WORKING_HOURS = config.minWorkingHours ?? DEFAULT_MIN_WORKING_HOURS;

        // Check if working day (fallback: Mon-Sat if no calendar entry)
        const dayOfWeek = today.getDay();
        const isWeekend = dayOfWeek === 0; // Sunday only
        const effectiveDayType = calendar?.dayType || (isWeekend ? 'WEEKEND' : 'WORKING_DAY');

        if (effectiveDayType !== 'WORKING_DAY') {
            return NextResponse.json({
                error: `Today is ${effectiveDayType}. No attendance required.`,
                dayType: effectiveDayType,
                holidayName: calendar?.holidayName
            }, { status: 400 });
        }

        // ───── 2. Geofencing (if enabled) ─────
        if (config.enableGeoFencing && location) {
            if (!config.schoolLatitude || !config.schoolLongitude) {
                return NextResponse.json({
                    error: 'School location not configured'
                }, { status: 400 });
            }

            const distance = calculateDistance(
                location.latitude,
                location.longitude,
                config.schoolLatitude,
                config.schoolLongitude
            );

            if (distance > config.allowedRadiusMeters) {
                return NextResponse.json({
                    error: `You are ${Math.round(distance)}m away. Must be within ${config.allowedRadiusMeters}m of school.`,
                    distance,
                    allowedRadius: config.allowedRadiusMeters,
                }, { status: 400 });
            }
        }

        // ───── 3. Parse school times from config ─────
        const [startH, startM] = config.defaultStartTime.split(':').map(Number);
        const [endH, endM] = config.defaultEndTime.split(':').map(Number);

        const schoolStart = new Date(today);
        schoolStart.setHours(startH, startM, 0, 0);

        const schoolEnd = new Date(today);
        schoolEnd.setHours(endH, endM, 0, 0);

        // Check-in window: schoolStart to schoolStart + CHECK_IN_WINDOW_HOURS
        const checkInDeadline = new Date(schoolStart);
        checkInDeadline.setHours(checkInDeadline.getHours() + CHECK_IN_WINDOW_HOURS);

        // Check-out window: schoolEnd to schoolEnd + CHECK_OUT_GRACE_HOURS
        const checkOutStart = new Date(schoolEnd);
        const checkOutDeadline = new Date(schoolEnd);
        checkOutDeadline.setHours(checkOutDeadline.getHours() + CHECK_OUT_GRACE_HOURS);

        // ───── 4. Transaction ─────
        const result = await prisma.$transaction(async (tx) => {
            // ────────────────────────
            // CHECK_IN
            // ────────────────────────
            if (type === 'CHECK_IN') {
                const existing = await tx.attendance.findUnique({
                    where: { userId_schoolId_date: { userId, schoolId, date: today } },
                });

                if (existing?.checkInTime) {
                    return {
                        success: false,
                        json: {
                            success: false,
                            message: 'Already checked in today',
                            attendance: existing
                        }
                    };
                }

                // Check if within check-in window
                if (now < schoolStart) {
                    return {
                        success: false,
                        json: {
                            success: false,
                            message: `Check-in opens at ${config.defaultStartTime}`,
                            opensAt: schoolStart.toISOString(),
                        }
                    };
                }

                if (now > checkInDeadline) {
                    return {
                        success: false,
                        json: {
                            success: false,
                            message: `Check-in window closed at ${checkInDeadline.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}`,
                            closedAt: checkInDeadline.toISOString(),
                        }
                    };
                }

                // Calculate if late using grace period from config
                const gracePeriod = new Date(schoolStart);
                gracePeriod.setMinutes(gracePeriod.getMinutes() + config.gracePeriodMinutes);
                const isLate = now > gracePeriod;
                const lateByMinutes = isLate ? Math.floor((now - gracePeriod) / 60000) : null;

                const data = {
                    status: isLate ? 'LATE' : 'PRESENT',
                    checkInTime: now,
                    isLateCheckIn: isLate,
                    lateByMinutes,
                    checkInLocation: location || null,
                    deviceInfo: enrichedDeviceInfo || null,
                    remarks,
                    markedBy: userId,
                    requiresApproval: false,
                    approvalStatus: 'NOT_REQUIRED',
                    workingHours: 0,
                };

                let attendance;
                if (existing) {
                    attendance = await tx.attendance.update({
                        where: { id: existing.id },
                        data
                    });
                } else {
                    attendance = await tx.attendance.create({
                        data: { userId, schoolId, date: today, ...data },
                    });
                }

                return {
                    success: true,
                    json: {
                        success: true,
                        message: isLate
                            ? `Checked in (Late by ${lateByMinutes} min)`
                            : 'Checked in successfully',
                        attendance,
                        isLate,
                        checkOutWindow: {
                            start: checkOutStart.toISOString(),
                            end: checkOutDeadline.toISOString(),
                        }
                    }
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
                    return {
                        success: false,
                        json: {
                            success: false,
                            message: 'No check-in record found for today'
                        }
                    };
                }

                if (attendance.checkOutTime) {
                    return {
                        success: false,
                        json: {
                            success: false,
                            message: 'Already checked out today',
                            attendance
                        }
                    };
                }

                const checkInTime = new Date(attendance.checkInTime);

                // Check if within check-out window
                if (now < checkOutStart) {
                    return {
                        success: false,
                        json: {
                            success: false,
                            message: `Check-out opens at ${config.defaultEndTime}`,
                            opensAt: checkOutStart.toISOString(),
                        }
                    };
                }

                if (now > checkOutDeadline) {
                    return {
                        success: false,
                        json: {
                            success: false,
                            message: `Check-out window closed at ${checkOutDeadline.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}. Contact admin for manual check-out.`,
                            deadline: checkOutDeadline.toISOString(),
                        }
                    };
                }

                // Check minimum working hours (from config)
                const minCheckOut = new Date(checkInTime);
                minCheckOut.setHours(minCheckOut.getHours() + MIN_WORKING_HOURS);

                if (now < minCheckOut) {
                    const timeStr = minCheckOut.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return {
                        success: false,
                        json: {
                            success: false,
                            message: `Minimum ${MIN_WORKING_HOURS} hours required. Can check out after ${timeStr}`,
                            minTime: minCheckOut.toISOString(),
                        }
                    };
                }

                // Calculate working hours
                const workingHoursRaw = (now - checkInTime) / (1000 * 60 * 60);
                const workingHours = Number(workingHoursRaw.toFixed(2));

                // Determine status based on hours worked (from config)
                let status = 'PRESENT';
                if (workingHours < config.halfDayHours) {
                    status = 'HALF_DAY';
                } else if (workingHours >= config.fullDayHours) {
                    status = 'PRESENT';
                }

                const updated = await tx.attendance.update({
                    where: { id: attendance.id },
                    data: {
                        checkOutTime: now,
                        checkOutLocation: location || null,
                        workingHours,
                        status,
                        remarks: remarks || attendance.remarks,
                    },
                });

                return {
                    success: true,
                    json: {
                        success: true,
                        message: `Checked out successfully. Worked ${workingHours.toFixed(2)} hours`,
                        attendance: updated,
                        workingHours: updated.workingHours,
                    }
                };
            }
        });

        if (result.success) {
            // Invalidate attendance cache
            await invalidatePattern(`attendance:${schoolId}*`);
        }

        return NextResponse.json(result.json);

    } catch (error) {
        console.error('Mark attendance error:', error);
        return NextResponse.json({
            error: 'Server error',
            details: error.message
        }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────────────────────────
// GET – Today's status + LIVE working hours
// ──────────────────────────────────────────────────────────────────────
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const userId = new URL(req.url).searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    try {
        const today = getISTDate();
        const now = new Date();
        const istNow = getISTNow();
        const month = istNow.getUTCMonth() + 1;
        const year = istNow.getUTCFullYear();

        // Fetch config
        let config = await prisma.attendanceConfig.findUnique({ where: { schoolId } });
        if (!config) {
            return NextResponse.json({
                error: 'Attendance config not found. Please set up calendar first.',
                needsSetup: true
            }, { status: 404 });
        }

        // Get dynamic values from config or use defaults
        const CHECK_IN_WINDOW_HOURS = config.checkInWindowHours ?? DEFAULT_CHECK_IN_WINDOW_HOURS;
        const CHECK_OUT_GRACE_HOURS = config.checkOutGraceHours ?? DEFAULT_CHECK_OUT_GRACE_HOURS;
        const MIN_WORKING_HOURS = config.minWorkingHours ?? DEFAULT_MIN_WORKING_HOURS;

        const [attendance, calendar, monthlyStats] = await Promise.all([
            prisma.attendance.findUnique({
                where: { userId_schoolId_date: { userId, schoolId, date: today } },
            }),
            prisma.schoolCalendar.findUnique({
                where: { schoolId_date: { schoolId, date: today } },
            }),
            getMonthlyStats(userId, schoolId, month, year),
        ]);

        // Calculate time windows using config times
        const [startH, startM] = config.defaultStartTime.split(':').map(Number);
        const [endH, endM] = config.defaultEndTime.split(':').map(Number);

        const schoolStart = new Date(today);
        schoolStart.setHours(startH, startM, 0, 0);

        const schoolEnd = new Date(today);
        schoolEnd.setHours(endH, endM, 0, 0);

        const checkInDeadline = new Date(schoolStart);
        checkInDeadline.setHours(checkInDeadline.getHours() + CHECK_IN_WINDOW_HOURS);

        const checkOutStart = new Date(schoolEnd);
        const checkOutDeadline = new Date(schoolEnd);
        checkOutDeadline.setHours(checkOutDeadline.getHours() + CHECK_OUT_GRACE_HOURS);

        // Calculate live working hours
        let liveWorkingHours = 0;
        if (attendance?.checkInTime && !attendance?.checkOutTime) {
            const checkInTime = new Date(attendance.checkInTime);
            const diffHours = (now - checkInTime) / (1000 * 60 * 60);
            liveWorkingHours = Number(diffHours.toFixed(2));
        }

        const finalWorkingHours = attendance?.checkOutTime
            ? (attendance.workingHours ?? 0)
            : liveWorkingHours;

        // Calculate minimum check-out time using config
        let minCheckOutTime = null;
        if (attendance?.checkInTime && !attendance?.checkOutTime) {
            const checkIn = new Date(attendance.checkInTime);
            minCheckOutTime = new Date(checkIn);
            minCheckOutTime.setHours(minCheckOutTime.getHours() + MIN_WORKING_HOURS);
        }

        // Determine if today is a working day (fallback: Mon-Sat if no calendar entry)
        const dayOfWeek = today.getDay();
        const isWeekend = dayOfWeek === 0; // Sunday only
        const effectiveDayType = calendar?.dayType || (isWeekend ? 'WEEKEND' : 'WORKING_DAY');
        const isWorkingDay = effectiveDayType === 'WORKING_DAY';

        return NextResponse.json({
            attendance: {
                ...attendance,
                workingHours: finalWorkingHours,
                liveWorkingHours: attendance?.checkOutTime ? null : liveWorkingHours,
            },
            isWorkingDay,
            dayType: effectiveDayType,
            holidayName: calendar?.holidayName,
            config: {
                startTime: config.defaultStartTime,
                endTime: config.defaultEndTime,
                gracePeriod: config.gracePeriodMinutes,
                enableGeoFencing: config.enableGeoFencing,
                allowedRadius: config.allowedRadiusMeters,
                halfDayHours: config.halfDayHours,
                fullDayHours: config.fullDayHours,
                minWorkingHours: MIN_WORKING_HOURS,
                checkInWindowHours: CHECK_IN_WINDOW_HOURS,
                checkOutGraceHours: CHECK_OUT_GRACE_HOURS,
                // Additional config fields
                autoMarkAbsent: config.autoMarkAbsent,
                autoMarkTime: config.autoMarkTime,
                requireApprovalDays: config.requireApprovalDays,
                sendDailyReminders: config.sendDailyReminders,
                reminderTime: config.reminderTime,
                notifyParents: config.notifyParents,
                minAttendancePercent: config.minAttendancePercent,
            },
            windows: {
                checkIn: {
                    start: schoolStart.toISOString(),
                    end: checkInDeadline.toISOString(),
                    isOpen: now >= schoolStart && now <= checkInDeadline,
                },
                checkOut: {
                    start: checkOutStart.toISOString(),
                    end: checkOutDeadline.toISOString(),
                    isOpen: now >= checkOutStart && now <= checkOutDeadline,
                    minTime: minCheckOutTime?.toISOString(),
                },
            },
            monthlyStats,
        });
    } catch (e) {
        console.error('GET error:', e);
        return NextResponse.json({
            error: 'Failed to fetch',
            details: e.message
        }, { status: 500 });
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
                where: {
                    schoolId,
                    date: { gte: startDate, lte: endDate },
                    dayType: 'WORKING_DAY'
                },
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
// Distance Helper (Haversine Formula)
// ──────────────────────────────────────────────────────────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}