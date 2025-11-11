// app/api/schools/[schoolId]/attendance/approvals/route.js
// Handle attendance approval requests

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch pending approvals
export async function GET(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') || 'PENDING';
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        const skip = (page - 1) * limit;

        const where = {
            schoolId,
            approvalStatus: status,
            requiresApproval: true,
            ...(userId && { userId })
        };

        const [approvals, total] = await Promise.all([
            prisma.attendance.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profilePicture: true,
                            role: { select: { name: true } },
                            student: {
                                select: {
                                    admissionNo: true,
                                    class: { select: { className: true } },
                                    section: { select: { name: true } }
                                }
                            },
                            teacher: {
                                select: {
                                    employeeId: true,
                                    designation: true
                                }
                            }
                        }
                    },
                    marker: {
                        select: { name: true, role: { select: { name: true } } }
                    },
                    approver: {
                        select: { name: true }
                    },
                    documents: true
                },
                orderBy: [
                    { date: 'desc' },
                    { markedAt: 'desc' }
                ],
                skip,
                take: limit
            }),
            prisma.attendance.count({ where })
        ]);

        return NextResponse.json({
            approvals,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Fetch approvals error:', error);
        return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
    }
}

// POST - Approve or reject attendance
export async function POST(req, { params }) {
    const { schoolId } = params;
    const body = await req.json();
    const { attendanceIds, action, approvedBy, remarks } = body;

    if (!attendanceIds || !action || !approvedBy) {
        return NextResponse.json({
            error: 'attendanceIds, action, and approvedBy are required'
        }, { status: 400 });
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    try {
        const results = {
            approved: [],
            rejected: [],
            failed: []
        };

        await prisma.$transaction(async (tx) => {
            for (const id of attendanceIds) {
                try {
                    const attendance = await tx.attendance.findUnique({
                        where: { id },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    fcmToken: true
                                }
                            }
                        }
                    });

                    if (!attendance) {
                        results.failed.push({ id, reason: 'Not found' });
                        continue;
                    }

                    if (attendance.schoolId !== schoolId) {
                        results.failed.push({ id, reason: 'Unauthorized' });
                        continue;
                    }

                    const updated = await tx.attendance.update({
                        where: { id },
                        data: {
                            approvalStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                            approvedBy,
                            approvedAt: new Date(),
                            approvalRemarks: remarks || null,
                        }
                    });

                    if (action === 'APPROVE') {
                        results.approved.push(updated);

                        // Update stats
                        await updateAttendanceStats(
                            tx,
                            schoolId,
                            attendance.userId,
                            new Date(attendance.date)
                        );
                    } else {
                        results.rejected.push(updated);
                    }

                    // Send notification
                    await tx.attendanceNotification.create({
                        data: {
                            schoolId,
                            userId: attendance.userId,
                            notificationType: action === 'APPROVE' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
                            title: action === 'APPROVE' ? 'Attendance Approved' : 'Attendance Rejected',
                            message: `Your attendance request for ${new Date(attendance.date).toLocaleDateString()} has been ${action.toLowerCase()}d.`,
                            scheduledFor: new Date(),
                            status: 'PENDING'
                        }
                    });

                } catch (error) {
                    results.failed.push({ id, error: error.message });
                }
            }
        });

        return NextResponse.json({
            success: true,
            results,
            summary: {
                approved: results.approved.length,
                rejected: results.rejected.length,
                failed: results.failed.length
            }
        });

    } catch (error) {
        console.error('Approval error:', error);
        return NextResponse.json({ error: 'Failed to process approvals' }, { status: 500 });
    }
}

// Helper function
async function updateAttendanceStats(tx, schoolId, userId, date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const academicYear = await tx.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true }
    });

    if (!academicYear) return;

    const stats = await tx.attendance.groupBy({
        by: ['status'],
        where: {
            userId,
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
                userId,
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
            userId,
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