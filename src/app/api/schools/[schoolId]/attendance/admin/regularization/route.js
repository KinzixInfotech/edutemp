// app/api/schools/[schoolId]/attendance/admin/regularization/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch regularization requests
export async function GET(req, { params }) {
    const { schoolId } = await params; // Fix: await params
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        const skip = (page - 1) * limit;

        // Smart status handling
        let approvalStatusCondition;
        if (statusParam) {
            const statuses = statusParam.includes(',')
                ? statusParam.split(',').map(s => s.trim())
                : [statusParam];
            approvalStatusCondition = statuses.length === 1
                ? { approvalStatus: statuses[0] }
                : { approvalStatus: { in: statuses } };
        } else {
            approvalStatusCondition = { approvalStatus: 'PENDING' };
        }

        const where = {
            schoolId,
            ...approvalStatusCondition, // Use smart condition
            requiresApproval: true,
            ...(userId && { userId }),
            ...(startDate && endDate && {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            })
        };

        const [requests, total] = await Promise.all([
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
                                    rollNumber: true,
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

        // Calculate days difference for each request
        const requestsWithDays = requests.map(req => {
            const daysDiff = Math.floor(
                (new Date() - new Date(req.date)) / (1000 * 60 * 60 * 24)
            );

            return {
                ...req,
                daysOld: daysDiff,
                isPastDate: new Date(req.date) < new Date(new Date().toDateString())
            };
        });

        return NextResponse.json({
            requests: requestsWithDays,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Fetch regularization error:', error);
        return NextResponse.json({
            error: 'Failed to fetch requests'
        }, { status: 500 });
    }
}

// POST - Approve or reject requests
export async function POST(req, { params }) {
    const { schoolId } = params;
    const { attendanceIds, action, approvedBy, remarks } = await req.json();

    if (!attendanceIds || !action || !approvedBy) {
        return NextResponse.json({
            error: 'attendanceIds, action, and approvedBy are required'
        }, { status: 400 });
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
        return NextResponse.json({
            error: 'Invalid action'
        }, { status: 400 });
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

                        // Update stats after approval
                        await updateAttendanceStats(
                            tx,
                            schoolId,
                            attendance.userId,
                            new Date(attendance.date)
                        );
                    } else {
                        results.rejected.push(updated);
                    }

                    // Create notification
                    await tx.attendanceNotification.create({
                        data: {
                            schoolId,
                            userId: attendance.userId,
                            notificationType: action === 'APPROVE' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
                            title: action === 'APPROVE'
                                ? 'Attendance Regularization Approved'
                                : 'Attendance Regularization Rejected',
                            message: `Your attendance request for ${new Date(attendance.date).toLocaleDateString()} has been ${action.toLowerCase()}d. ${remarks ? `Reason: ${remarks}` : ''}`,
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
        return NextResponse.json({
            error: 'Failed to process approvals'
        }, { status: 500 });
    }
}

// PUT - Request regularization (for teachers/staff to request correction)
export async function PUT(req, { params }) {
    const { schoolId } = params;
    const {
        userId,
        date,
        requestedStatus,
        reason,
        documents
    } = await req.json();

    if (!userId || !date || !requestedStatus || !reason) {
        return NextResponse.json({
            error: 'userId, date, requestedStatus, and reason are required'
        }, { status: 400 });
    }

    try {
        const requestDate = new Date(date);
        const today = new Date(new Date().toDateString());

        // Check if requesting for past date
        if (requestDate >= today) {
            return NextResponse.json({
                error: 'Can only request regularization for past dates'
            }, { status: 400 });
        }

        // Check if attendance exists
        const existing = await prisma.attendance.findUnique({
            where: {
                userId_schoolId_date: {
                    userId,
                    schoolId,
                    date: requestDate
                }
            }
        });

        let result;

        if (existing) {
            // Update existing attendance with approval required
            result = await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    status: requestedStatus,
                    remarks: reason,
                    requiresApproval: true,
                    approvalStatus: 'PENDING',
                    markedAt: new Date()
                }
            });
        } else {
            // Create new attendance record pending approval
            result = await prisma.attendance.create({
                data: {
                    userId,
                    schoolId,
                    date: requestDate,
                    status: requestedStatus,
                    remarks: reason,
                    requiresApproval: true,
                    approvalStatus: 'PENDING',
                    markedBy: userId
                }
            });
        }

        // Add documents if provided
        if (documents && documents.length > 0) {
            await prisma.attendanceDocument.createMany({
                data: documents.map(doc => ({
                    attendanceId: result.id,
                    documentType: doc.type,
                    fileUrl: doc.url,
                    fileName: doc.name
                }))
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Regularization request submitted',
            attendance: result
        });

    } catch (error) {
        console.error('Regularization request error:', error);
        return NextResponse.json({
            error: 'Failed to submit request'
        }, { status: 500 });
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

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const stats = await tx.attendance.groupBy({
        by: ['status'],
        where: {
            userId,
            schoolId,
            date: { gte: monthStart, lte: monthEnd }
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

 