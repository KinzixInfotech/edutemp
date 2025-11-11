// app/api/schools/[schoolId]/attendance/mark/route.js
// Self attendance marking for teachers and staff

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

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
        return NextResponse.json({
            error: 'userId and type are required'
        }, { status: 400 });
    }

    try {
        const now = new Date();
        const today = new Date(now.toDateString());

        // Get attendance config
        const config = await prisma.attendanceConfig.findUnique({
            where: { schoolId }
        });

        if (!config) {
            return NextResponse.json({
                error: 'Attendance config not found'
            }, { status: 404 });
        }

        // Check geofencing if enabled
        if (config.enableGeoFencing && location) {
            const distance = calculateDistance(
                location.latitude,
                location.longitude,
                config.schoolLatitude,
                config.schoolLongitude
            );

            if (distance > config.allowedRadiusMeters) {
                return NextResponse.json({
                    error: `You are ${Math.round(distance)}m away from school. Must be within ${config.allowedRadiusMeters}m.`,
                    distance,
                    allowedRadius: config.allowedRadiusMeters
                }, { status: 400 });
            }
        }

        // Check if it's a working day
        const calendar = await prisma.schoolCalendar.findUnique({
            where: {
                schoolId_date: {
                    schoolId,
                    date: today
                }
            }
        });

        if (calendar?.dayType !== 'WORKING_DAY') {
            return NextResponse.json({
                error: `Today is ${calendar?.dayType || 'HOLIDAY'}`,
                dayType: calendar?.dayType
            }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            if (type === 'CHECK_IN') {
                // Check if already checked in
                const existing = await tx.attendance.findUnique({
                    where: {
                        userId_schoolId_date: {
                            userId,
                            schoolId,
                            date: today
                        }
                    }
                });

                if (existing) {
                    return {
                        success: false,
                        message: 'Already checked in today',
                        attendance: existing
                    };
                }

                // Calculate if late
                const [hours, minutes] = config.defaultStartTime.split(':').map(Number);
                const startTime = new Date(now);
                startTime.setHours(hours, minutes, 0, 0);

                const graceTime = new Date(startTime);
                graceTime.setMinutes(graceTime.getMinutes() + config.gracePeriodMinutes);

                const isLate = now > graceTime;
                const lateByMinutes = isLate ? Math.floor((now - graceTime) / 60000) : null;

                // Create attendance
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
                    message: isLate ? `Checked in (Late by ${lateByMinutes} minutes)` : 'Checked in successfully',
                    attendance,
                    isLate
                };

            } else if (type === 'CHECK_OUT') {
                const attendance = await tx.attendance.findUnique({
                    where: {
                        userId_schoolId_date: {
                            userId,
                            schoolId,
                            date: today
                        }
                    }
                });

                if (!attendance) {
                    return {
                        success: false,
                        message: 'No check-in record found'
                    };
                }

                if (attendance.checkOutTime) {
                    return {
                        success: false,
                        message: 'Already checked out',
                        attendance
                    };
                }

                // Calculate working hours
                const checkInTime = new Date(attendance.checkInTime);
                const workingHours = (now - checkInTime) / (1000 * 60 * 60);

                // Determine if half day
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
                    message: 'Checked out successfully',
                    attendance: updated,
                    workingHours
                };
            }
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Mark attendance error:', error);
        return NextResponse.json({
            error: 'Failed to mark attendance',
            details: error.message
        }, { status: 500 });
    }
}

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

        const [attendance, config, calendar] = await Promise.all([
            prisma.attendance.findUnique({
                where: {
                    userId_schoolId_date: {
                        userId,
                        schoolId,
                        date: today
                    }
                }
            }),
            prisma.attendanceConfig.findUnique({
                where: { schoolId }
            }),
            prisma.schoolCalendar.findUnique({
                where: {
                    schoolId_date: {
                        schoolId,
                        date: today
                    }
                }
            })
        ]);

        const isWorkingDay = calendar?.dayType === 'WORKING_DAY';

        return NextResponse.json({
            attendance,
            isWorkingDay,
            dayType: calendar?.dayType,
            holidayName: calendar?.holidayName,
            config: config ? {
                startTime: config.defaultStartTime,
                endTime: config.defaultEndTime,
                gracePeriod: config.gracePeriodMinutes,
                enableGeoFencing: config.enableGeoFencing,
                allowedRadius: config.allowedRadiusMeters
            } : null
        });

    } catch (error) {
        console.error('Fetch attendance error:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }
}

// PUT - Request to mark past attendance
export async function PUT(req, { params }) {
    const { schoolId } = params;
    const body = await req.json();
    const {
        userId,
        date,
        status,
        reason,
        checkInTime,
        checkOutTime,
        documents
    } = body;

    if (!userId || !date || !status || !reason) {
        return NextResponse.json({
            error: 'Missing required fields'
        }, { status: 400 });
    }

    try {
        const attendanceDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        attendanceDate.setHours(0, 0, 0, 0);

        if (attendanceDate >= today) {
            return NextResponse.json({
                error: 'Can only request for past dates'
            }, { status: 400 });
        }

        // Check if already exists
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_schoolId_date: {
                    userId,
                    schoolId,
                    date: attendanceDate
                }
            }
        });

        if (existing && existing.approvalStatus === 'APPROVED') {
            return NextResponse.json({
                error: 'Attendance already approved for this date'
            }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const attendance = await tx.attendance.upsert({
                where: {
                    userId_schoolId_date: {
                        userId,
                        schoolId,
                        date: attendanceDate
                    }
                },
                update: {
                    status,
                    checkInTime: checkInTime ? new Date(checkInTime) : null,
                    checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
                    remarks: reason,
                    markedBy: userId,
                    markedAt: new Date(),
                    requiresApproval: true,
                    approvalStatus: 'PENDING'
                },
                create: {
                    userId,
                    schoolId,
                    date: attendanceDate,
                    status,
                    checkInTime: checkInTime ? new Date(checkInTime) : null,
                    checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
                    remarks: reason,
                    markedBy: userId,
                    requiresApproval: true,
                    approvalStatus: 'PENDING'
                }
            });

            // Upload documents if any
            if (documents && documents.length > 0) {
                await tx.attendanceDocument.createMany({
                    data: documents.map(doc => ({
                        attendanceId: attendance.id,
                        documentType: doc.type,
                        fileUrl: doc.url,
                        fileName: doc.name
                    }))
                });
            }

            // Notify admin
            await tx.attendanceNotification.create({
                data: {
                    schoolId,
                    userId, // Will be sent to admin
                    notificationType: 'APPROVAL_REQUIRED',
                    title: 'Past Attendance Approval Required',
                    message: `Request to mark attendance for ${attendanceDate.toLocaleDateString()}`,
                    scheduledFor: new Date(),
                    status: 'PENDING'
                }
            });

            return attendance;
        });

        return NextResponse.json({
            success: true,
            message: 'Request submitted for approval',
            attendance: result
        });

    } catch (error) {
        console.error('Past attendance error:', error);
        return NextResponse.json({
            error: 'Failed to submit request',
            details: error.message
        }, { status: 500 });
    }
}

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}