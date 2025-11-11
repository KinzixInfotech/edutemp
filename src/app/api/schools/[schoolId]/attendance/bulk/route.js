// app/api/schools/[schoolId]/attendance/bulk/route.js
// Bulk attendance marking for teachers and admins

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch students for bulk marking
export async function GET(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const classId = searchParams.get('classId');
    const sectionId = searchParams.get('sectionId');
    const date = searchParams.get('date') ? new Date(searchParams.get('date')) : new Date();

    if (!classId) {
        return NextResponse.json({ error: 'classId is required' }, { status: 400 });
    }
    try {
        // Get students in class/section
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                classId: parseInt(classId),
                ...(sectionId && { sectionId: parseInt(sectionId) }),
                user: {
                    deletedAt: null,
                    status: 'ACTIVE'
                }
            },
            select: {
                userId: true,
                name: true,
                admissionNo: true,
                rollNumber: true,
                profilePicture: true,
                class: {
                    select: { className: true }
                },
                section: {
                    select: { name: true }
                },
                user: {
                    select: {
                        attendance: {
                            where: { date: new Date(date.toDateString()) },
                            select: {
                                id: true,
                                status: true,
                                checkInTime: true,
                                remarks: true,
                                isLateCheckIn: true,
                            }
                        }
                    }
                }
            },
            orderBy: [
                { rollNumber: 'asc' },
                { name: 'asc' }
            ]
        });

        // Check if bulk attendance already marked
        const existingBulk = await prisma.bulkAttendance.findFirst({
            where: {
                schoolId,
                classId: parseInt(classId),
                ...(sectionId && { sectionId: parseInt(sectionId) }),
                date: new Date(date.toDateString())
            },
            include: {
                marker: {
                    select: { name: true }
                }
            }
        });

        // Format response
        const studentsWithAttendance = students.map(student => ({
            userId: student.userId,
            name: student.name,
            admissionNo: student.admissionNo,
            rollNumber: student.rollNumber,
            profilePicture: student.profilePicture,
            className: student.class?.className,
            sectionName: student.section?.name,
            attendance: student.user.attendance[0] || null,
            isMarked: !!student.user.attendance[0],
        }));

        return NextResponse.json({
            students: studentsWithAttendance,
            totalStudents: students.length,
            markedCount: studentsWithAttendance.filter(s => s.isMarked).length,
            existingBulk,
            date: date.toISOString(),
        });

    } catch (error) {
        console.error('Fetch students error:', error);
        return NextResponse.json({
            error: 'Failed to fetch students',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Submit bulk attendance
export async function POST(req, { params }) {
    const { schoolId } = params;
    const body = await req.json();
    const {
        classId,
        sectionId,
        date,
        attendance,
        markedBy,
        remarks,
        markAllPresent = false
    } = body;

    if (!classId || !date || !markedBy) {
        return NextResponse.json({
            error: 'classId, date, and markedBy are required'
        }, { status: 400 });
    }

    try {
        const attendanceDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        attendanceDate.setHours(0, 0, 0, 0);

        // Check if marking past attendance (requires approval)
        const requiresApproval = attendanceDate < today;

        // Get attendance config
        const config = await prisma.attendanceConfig.findUnique({
            where: { schoolId }
        });

        const results = {
            success: [],
            failed: [],
            skipped: [],
        };

        // Process in transaction
        await prisma.$transaction(async (tx) => {
            // If markAllPresent, get all students
            let attendanceData = attendance;

            if (markAllPresent) {
                const students = await tx.student.findMany({
                    where: {
                        schoolId,
                        classId: parseInt(classId),
                        ...(sectionId && { sectionId: parseInt(sectionId) }),
                        user: {
                            deletedAt: null,
                            status: 'ACTIVE'
                        }
                    },
                    select: { userId: true }
                });

                attendanceData = students.map(s => ({
                    userId: s.userId,
                    status: 'PRESENT',
                }));
            }

            // Bulk upsert attendance records
            for (const record of attendanceData) {
                try {
                    const existingAttendance = await tx.attendance.findUnique({
                        where: {
                            userId_schoolId_date: {
                                userId: record.userId,
                                schoolId,
                                date: attendanceDate
                            }
                        }
                    });

                    if (existingAttendance && !record.forceUpdate) {
                        results.skipped.push({
                            userId: record.userId,
                            reason: 'Already marked'
                        });
                        continue;
                    }

                    const attendanceRecord = await tx.attendance.upsert({
                        where: {
                            userId_schoolId_date: {
                                userId: record.userId,
                                schoolId,
                                date: attendanceDate
                            }
                        },
                        update: {
                            status: record.status,
                            checkInTime: record.checkInTime || null,
                            checkOutTime: record.checkOutTime || null,
                            remarks: record.remarks || null,
                            isLateCheckIn: record.isLateCheckIn || false,
                            lateByMinutes: record.lateByMinutes || null,
                            markedBy,
                            markedAt: new Date(),
                            requiresApproval,
                            approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
                        },
                        create: {
                            userId: record.userId,
                            schoolId,
                            date: attendanceDate,
                            status: record.status,
                            checkInTime: record.checkInTime || null,
                            checkOutTime: record.checkOutTime || null,
                            remarks: record.remarks || null,
                            isLateCheckIn: record.isLateCheckIn || false,
                            lateByMinutes: record.lateByMinutes || null,
                            markedBy,
                            requiresApproval,
                            approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
                        }
                    });

                    results.success.push(attendanceRecord.id);

                } catch (error) {
                    results.failed.push({
                        userId: record.userId,
                        error: error.message
                    });
                }
            }

            // Create bulk attendance record
            const statusCounts = attendanceData.reduce((acc, r) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            }, {});

            await tx.bulkAttendance.create({
                data: {
                    schoolId,
                    classId: parseInt(classId),
                    sectionId: sectionId ? parseInt(sectionId) : null,
                    date: attendanceDate,
                    markedBy,
                    totalStudents: attendanceData.length,
                    presentCount: statusCounts.PRESENT || 0,
                    absentCount: statusCounts.ABSENT || 0,
                    lateCount: statusCounts.LATE || 0,
                    halfDayCount: statusCounts.HALF_DAY || 0,
                    remarks,
                }
            });

            // Update attendance stats (async, don't wait)
            updateAttendanceStats(tx, schoolId, attendanceDate).catch(console.error);
        });

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: attendance?.length || 0,
                successful: results.success.length,
                failed: results.failed.length,
                skipped: results.skipped.length,
            },
            requiresApproval,
        });

    } catch (error) {
        console.error('Bulk attendance error:', error);
        return NextResponse.json({
            error: 'Failed to mark attendance',
            details: error.message
        }, { status: 500 });
    }
}

// Helper function to update stats
async function updateAttendanceStats(tx, schoolId, date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const academicYear = await tx.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true }
    });

    if (!academicYear) return;

    // Get all users with attendance in this month
    const users = await tx.attendance.groupBy({
        by: ['userId'],
        where: {
            schoolId,
            date: {
                gte: new Date(year, month - 1, 1),
                lte: new Date(year, month, 0)
            }
        },
        _count: { id: true }
    });

    for (const user of users) {
        const stats = await tx.attendance.groupBy({
            by: ['status'],
            where: {
                userId: user.userId,
                schoolId,
                date: {
                    gte: new Date(year, month - 1, 1),
                    lte: new Date(year, month, 0)
                }
            },
            _count: { id: true }
        });

        const totalPresent = stats.find(s => s.status === 'PRESENT')?._count.id || 0;
        const totalAbsent = stats.find(s => s.status === 'ABSENT')?._count.id || 0;
        const totalHalfDay = stats.find(s => s.status === 'HALF_DAY')?._count.id || 0;
        const totalLate = stats.find(s => s.status === 'LATE')?._count.id || 0;
        const totalLeaves = stats.find(s => s.status === 'ON_LEAVE')?._count.id || 0;

        const totalDays = totalPresent + totalAbsent + totalHalfDay + totalLate + totalLeaves;
        const attendancePercentage = totalDays > 0
            ? ((totalPresent + totalLate + (totalHalfDay * 0.5)) / totalDays) * 100
            : 0;

        await tx.attendanceStats.upsert({
            where: {
                userId_academicYearId_month_year: {
                    userId: user.userId,
                    academicYearId: academicYear.id,
                    month,
                    year
                }
            },
            update: {
                totalPresent,
                totalAbsent,
                totalHalfDay,
                totalLate,
                totalLeaves,
                attendancePercentage,
                lastCalculated: new Date(),
            },
            create: {
                userId: user.userId,
                schoolId,
                academicYearId: academicYear.id,
                month,
                year,
                totalPresent,
                totalAbsent,
                totalHalfDay,
                totalLate,
                totalLeaves,
                attendancePercentage,
            }
        });
    }
}

// PUT - Update existing bulk attendance
export async function PUT(req, { params }) {
    const { schoolId } = params;
    const body = await req.json();
    const { bulkId, updates, markedBy } = body;

    if (!bulkId || !updates) {
        return NextResponse.json({
            error: 'bulkId and updates are required'
        }, { status: 400 });
    }

    try {
        const results = {
            updated: [],
            failed: []
        };

        await prisma.$transaction(async (tx) => {
            for (const update of updates) {
                try {
                    await tx.attendance.update({
                        where: {
                            userId_schoolId_date: {
                                userId: update.userId,
                                schoolId,
                                date: new Date(update.date)
                            }
                        },
                        data: {
                            status: update.status,
                            remarks: update.remarks,
                            markedBy,
                            markedAt: new Date(),
                        }
                    });

                    results.updated.push(update.userId);
                } catch (error) {
                    results.failed.push({
                        userId: update.userId,
                        error: error.message
                    });
                }
            }
        });

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Update bulk attendance error:', error);
        return NextResponse.json({
            error: 'Failed to update attendance'
        }, { status: 500 });
    }
}