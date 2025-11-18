// app/api/schools/[schoolId]/attendance/admin/leave-management/route.js

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch leave requests
export async function GET(req, { params }) {
    const { schoolId } = await params; // Fix: await params
    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get('status');
    const userId = searchParams.get('userId');
    const leaveType = searchParams.get('leaveType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        const skip = (page - 1) * limit;

        // Smart status handling - works for both single and multiple
        let statusCondition;
        if (statusParam) {
            const statuses = statusParam.includes(',')
                ? statusParam.split(',').map(s => s.trim())
                : [statusParam];
            statusCondition = statuses.length === 1
                ? { status: statuses[0] }
                : { status: { in: statuses } };
        } else {
            statusCondition = { status: 'PENDING' };
        }

        const where = {
            schoolId,
            ...statusCondition, // Use smart condition
            ...(userId && { userId }),
            ...(leaveType && { leaveType }),
            ...(startDate && endDate && {
                startDate: { gte: new Date(startDate) },
                endDate: { lte: new Date(endDate) }
            })
        };


        const [leaves, total] = await Promise.all([
            prisma.leaveRequest.findMany({
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
                                    designation: true,
                                    department: { select: { name: true } }
                                }
                            }
                        }
                    },
                    reviewer: {
                        select: { name: true }
                    },
                    documents: true
                },
                orderBy: [
                    { status: 'asc' },
                    { submittedAt: 'desc' }
                ],
                skip,
                take: limit
            }),
            prisma.leaveRequest.count({ where })
        ]);

        // Get leave balance for each user
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true }
        });

        const leavesWithBalance = await Promise.all(
            leaves.map(async (leave) => {
                const balance = await prisma.leaveBalance.findFirst({
                    where: {
                        userId: leave.userId,
                        schoolId,
                        academicYearId: academicYear.id
                    }
                });

                return {
                    ...leave,
                    balance: balance ? {
                        casualLeave: {
                            total: balance.casualLeaveTotal,
                            used: balance.casualLeaveUsed,
                            balance: balance.casualLeaveBalance
                        },
                        sickLeave: {
                            total: balance.sickLeaveTotal,
                            used: balance.sickLeaveUsed,
                            balance: balance.sickLeaveBalance
                        },
                        earnedLeave: {
                            total: balance.earnedLeaveTotal,
                            used: balance.earnedLeaveUsed,
                            balance: balance.earnedLeaveBalance
                        }
                    } : null
                };
            })
        );

        return NextResponse.json({
            leaves: leavesWithBalance,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Leave fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch leaves',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Approve or reject leave requests
export async function POST(req, { params }) {
    const { schoolId } = params;
    const { leaveRequestIds, action, adminRemarks, reviewedBy } = await req.json();

    if (!leaveRequestIds || !action || !reviewedBy) {
        return NextResponse.json({
            error: 'leaveRequestIds, action, and reviewedBy are required'
        }, { status: 400 });
    }

    if (!['APPROVED', 'REJECTED', 'CANCELLED'].includes(action)) {
        return NextResponse.json({
            error: 'Invalid action. Must be APPROVED, REJECTED, or CANCELLED'
        }, { status: 400 });
    }

    try {
        const results = { approved: [], rejected: [], cancelled: [], failed: [] };

        await prisma.$transaction(async (tx) => {
            for (const id of leaveRequestIds) {
                try {
                    const leave = await tx.leaveRequest.findUnique({
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

                    if (!leave) {
                        results.failed.push({ id, reason: 'Leave request not found' });
                        continue;
                    }

                    if (leave.schoolId !== schoolId) {
                        results.failed.push({ id, reason: 'Unauthorized' });
                        continue;
                    }

                    // Update leave request
                    const updated = await tx.leaveRequest.update({
                        where: { id },
                        data: {
                            status: action,
                            reviewedBy,
                            reviewedAt: new Date(),
                            reviewRemarks: adminRemarks || null
                        }
                    });

                    if (action === 'APPROVED') {
                        // Get academic year
                        const academicYear = await tx.academicYear.findFirst({
                            where: { schoolId, isActive: true }
                        });

                        if (!academicYear) {
                            results.failed.push({ id, reason: 'No active academic year' });
                            continue;
                        }

                        // Update leave balance
                        const balance = await tx.leaveBalance.findFirst({
                            where: {
                                userId: leave.userId,
                                schoolId,
                                academicYearId: academicYear.id
                            }
                        });

                        if (balance) {
                            const leaveTypeKey = leave.leaveType.toLowerCase();
                            const usedField = `${leaveTypeKey}LeaveUsed`;
                            const balanceField = `${leaveTypeKey}LeaveBalance`;

                            await tx.leaveBalance.update({
                                where: { id: balance.id },
                                data: {
                                    [usedField]: { increment: leave.totalDays },
                                    [balanceField]: { decrement: leave.totalDays }
                                }
                            });
                        } else {
                            // Create initial balance if not exists
                            await tx.leaveBalance.create({
                                data: {
                                    userId: leave.userId,
                                    schoolId,
                                    academicYearId: academicYear.id,
                                    casualLeaveUsed: leave.leaveType === 'CASUAL' ? leave.totalDays : 0,
                                    sickLeaveUsed: leave.leaveType === 'SICK' ? leave.totalDays : 0,
                                    earnedLeaveUsed: leave.leaveType === 'EARNED' ? leave.totalDays : 0,
                                    casualLeaveBalance: leave.leaveType === 'CASUAL' ? 12 - leave.totalDays : 12,
                                    sickLeaveBalance: leave.leaveType === 'SICK' ? 10 - leave.totalDays : 10,
                                    earnedLeaveBalance: leave.leaveType === 'EARNED' ? 15 - leave.totalDays : 15
                                }
                            });
                        }

                        // Create attendance records for leave dates
                        const dates = [];
                        const start = new Date(leave.startDate);
                        const end = new Date(leave.endDate);

                        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            dates.push(new Date(d));
                        }

                        // Check if dates are working days
                        const workingDays = await tx.schoolCalendar.findMany({
                            where: {
                                schoolId,
                                date: { in: dates },
                                dayType: 'WORKING_DAY'
                            }
                        });

                        // Only create attendance for working days
                        const workingDates = workingDays.map(wd => wd.date);

                        await tx.attendance.createMany({
                            data: workingDates.map(date => ({
                                userId: leave.userId,
                                schoolId,
                                date,
                                status: 'ON_LEAVE',
                                remarks: `${leave.leaveType} Leave: ${leave.reason}`,
                                leaveRequestId: leave.id,
                                markedBy: reviewedBy,
                                requiresApproval: false,
                                approvalStatus: 'NOT_REQUIRED'
                            })),
                            skipDuplicates: true
                        });

                        results.approved.push(updated);
                    } else if (action === 'REJECTED') {
                        results.rejected.push(updated);
                    } else {
                        results.cancelled.push(updated);
                    }

                    // Send notification
                    await tx.attendanceNotification.create({
                        data: {
                            schoolId,
                            userId: leave.userId,
                            notificationType: action === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
                            title: `Leave Request ${action}`,
                            message: `Your ${leave.leaveType} leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been ${action.toLowerCase()}.${adminRemarks ? ` Remarks: ${adminRemarks}` : ''}`,
                            scheduledFor: new Date(),
                            status: 'PENDING'
                        }
                    });

                } catch (error) {
                    console.error('Leave processing error:', error);
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
                cancelled: results.cancelled.length,
                failed: results.failed.length
            }
        });

    } catch (error) {
        console.error('Leave approval error:', error);
        return NextResponse.json({
            error: 'Failed to process leaves',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Create new leave request (by teacher/staff)
export async function PUT(req, { params }) {
    const { schoolId } = params;
    const {
        userId,
        leaveType,
        startDate,
        endDate,
        reason,
        emergencyContact,
        emergencyContactPhone,
        documents
    } = await req.json();

    if (!userId || !leaveType || !startDate || !endDate || !reason) {
        return NextResponse.json({
            error: 'userId, leaveType, startDate, endDate, and reason are required'
        }, { status: 400 });
    }

    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            return NextResponse.json({
                error: 'Start date must be before end date'
            }, { status: 400 });
        }

        // Calculate total days
        const diffTime = Math.abs(end - start);
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Check leave balance
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true }
        });

        const balance = await prisma.leaveBalance.findFirst({
            where: {
                userId,
                schoolId,
                academicYearId: academicYear.id
            }
        });

        if (balance) {
            const leaveTypeKey = leaveType.toLowerCase();
            const balanceField = `${leaveTypeKey}LeaveBalance`;

            if (balance[balanceField] < totalDays) {
                return NextResponse.json({
                    error: `Insufficient ${leaveType} leave balance. Available: ${balance[balanceField]}, Requested: ${totalDays}`
                }, { status: 400 });
            }
        }

        // Create leave request
        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                userId,
                schoolId,
                leaveType,
                startDate: start,
                endDate: end,
                totalDays,
                reason,
                emergencyContact,
                emergencyContactPhone,
                status: 'PENDING'
            }
        });

        // Add documents if provided
        if (documents && documents.length > 0) {
            await prisma.leaveDocument.createMany({
                data: documents.map(doc => ({
                    leaveRequestId: leaveRequest.id,
                    documentType: doc.type || 'OTHER',
                    fileUrl: doc.url,
                    fileName: doc.name
                }))
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Leave request submitted successfully',
            leaveRequest
        });

    } catch (error) {
        console.error('Leave request creation error:', error);
        return NextResponse.json({
            error: 'Failed to create leave request',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Cancel leave request
export async function DELETE(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const leaveRequestId = searchParams.get('leaveRequestId');
    const userId = searchParams.get('userId');

    if (!leaveRequestId) {
        return NextResponse.json({
            error: 'leaveRequestId required'
        }, { status: 400 });
    }

    try {
        const leave = await prisma.leaveRequest.findUnique({
            where: { id: leaveRequestId }
        });

        if (!leave) {
            return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
        }

        if (leave.schoolId !== schoolId || leave.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (leave.status !== 'PENDING') {
            return NextResponse.json({
                error: 'Can only cancel pending leave requests'
            }, { status: 400 });
        }

        await prisma.leaveRequest.update({
            where: { id: leaveRequestId },
            data: { status: 'CANCELLED' }
        });

        return NextResponse.json({
            success: true,
            message: 'Leave request cancelled'
        });

    } catch (error) {
        console.error('Leave cancellation error:', error);
        return NextResponse.json({
            error: 'Failed to cancel leave request'
        }, { status: 500 });
    }
}