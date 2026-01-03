import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

/**
 * Unified Approvals API for Principal/Director
 * GET - Fetches all pending approvals across categories
 * POST - Approve/reject with reason
 */

// GET - Fetch all pending approvals
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category"); // leave, fee_discount, library, payroll

        const cacheKey = generateKey('approvals:pending', { schoolId, category });

        const result = await remember(cacheKey, async () => {
            const approvals = {
                summary: {
                    total: 0,
                    leave: 0,
                    feeDiscount: 0,
                    library: 0,
                    payroll: 0,
                },
                items: {
                    leave: [],
                    feeDiscount: [],
                    library: [],
                    payroll: [],
                }
            };

            // 1. Leave Requests (PENDING)
            if (!category || category === 'leave') {
                const leaveRequests = await prisma.leaveRequest.findMany({
                    where: {
                        schoolId,
                        status: 'PENDING',
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profilePicture: true,
                                role: { select: { name: true } },
                            },
                        },
                    },
                    orderBy: { submittedAt: 'asc' },
                    take: 50,
                });

                approvals.items.leave = leaveRequests.map(req => ({
                    id: req.id,
                    type: 'leave',
                    title: `${req.leaveType} Leave Request`,
                    subtitle: `${req.user?.name || 'Staff'} - ${req.user?.role?.name || 'Unknown'}`,
                    description: req.reason,
                    startDate: req.startDate,
                    endDate: req.endDate,
                    totalDays: req.totalDays,
                    submittedAt: req.submittedAt,
                    user: req.user,
                    pendingSince: getTimeSince(req.submittedAt),
                    isUrgent: isOverdue(req.submittedAt, 48),
                }));
                approvals.summary.leave = leaveRequests.length;
            }

            // 2. Fee Discounts (pending = no approvedBy)
            if (!category || category === 'fee_discount') {
                const feeDiscounts = await prisma.feeDiscount.findMany({
                    where: {
                        approvedBy: null,
                        studentFee: {
                            schoolId,
                        },
                    },
                    include: {
                        studentFee: {
                            include: {
                                student: {
                                    select: {
                                        id: true,
                                        name: true,
                                        admissionNo: true,
                                        class: { select: { className: true } },
                                        section: { select: { name: true } },
                                        user: { select: { profilePicture: true } },
                                    },
                                },
                                feeStructureItem: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                    take: 50,
                });

                approvals.items.feeDiscount = feeDiscounts.map(disc => ({
                    id: disc.id,
                    type: 'fee_discount',
                    title: `Fee Discount - ₹${disc.amount.toLocaleString('en-IN')}`,
                    subtitle: `${disc.studentFee?.student?.name || 'Student'} - ${disc.studentFee?.student?.class?.className || ''} ${disc.studentFee?.student?.section?.name || ''}`,
                    description: disc.reason,
                    discountType: disc.discountType,
                    value: disc.value,
                    amount: disc.amount,
                    feeName: disc.studentFee?.feeStructureItem?.name,
                    student: disc.studentFee?.student,
                    submittedAt: disc.createdAt,
                    pendingSince: getTimeSince(disc.createdAt),
                    isUrgent: isOverdue(disc.createdAt, 48),
                }));
                approvals.summary.feeDiscount = feeDiscounts.length;
            }

            // 3. Library Book Requests (PENDING)
            if (!category || category === 'library') {
                const libraryRequests = await prisma.libraryBookRequest.findMany({
                    where: {
                        schoolId,
                        status: 'PENDING',
                    },
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                coverImage: true,
                                copies: {
                                    where: { status: 'AVAILABLE' },
                                    select: { id: true },
                                },
                            },
                        },
                    },
                    orderBy: { requestDate: 'asc' },
                    take: 50,
                });

                // Fetch users for library requests
                const userIds = [...new Set(libraryRequests.map(r => r.userId))];
                const users = await prisma.user.findMany({
                    where: { id: { in: userIds } },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true,
                        role: { select: { name: true } },
                    },
                });
                const userMap = Object.fromEntries(users.map(u => [u.id, u]));

                approvals.items.library = libraryRequests.map(req => ({
                    id: req.id,
                    type: 'library',
                    title: req.book?.title || 'Unknown Book',
                    subtitle: `Requested by ${userMap[req.userId]?.name || 'Unknown'}`,
                    description: `${req.userType} - ${req.book?.author || 'Unknown Author'}`,
                    book: req.book,
                    user: userMap[req.userId],
                    availableCopies: req.book?.copies?.length || 0,
                    submittedAt: req.requestDate,
                    pendingSince: getTimeSince(req.requestDate),
                    isUrgent: isOverdue(req.requestDate, 48),
                }));
                approvals.summary.library = libraryRequests.length;
            }

            // 4. Payroll Periods (PENDING_APPROVAL)
            if (!category || category === 'payroll') {
                const payrollPeriods = await prisma.payrollPeriod.findMany({
                    where: {
                        schoolId,
                        status: 'PENDING_APPROVAL',
                    },
                    include: {
                        _count: {
                            select: { payrollItems: true },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                    take: 20,
                });

                // Get total amounts for each period
                for (const period of payrollPeriods) {
                    const totals = await prisma.payrollItem.aggregate({
                        where: { periodId: period.id },
                        _sum: { netSalary: true },
                    });
                    period.totalAmount = totals._sum.netSalary || 0;
                }

                approvals.items.payroll = payrollPeriods.map(period => ({
                    id: period.id,
                    type: 'payroll',
                    title: `${period.month}/${period.year} Payroll`,
                    subtitle: `${period._count.payrollItems} employees`,
                    description: `Total: ₹${(period.totalAmount || 0).toLocaleString('en-IN')}`,
                    month: period.month,
                    year: period.year,
                    employeeCount: period._count.payrollItems,
                    totalAmount: period.totalAmount,
                    submittedAt: period.createdAt,
                    pendingSince: getTimeSince(period.createdAt),
                    isUrgent: isOverdue(period.createdAt, 48),
                }));
                approvals.summary.payroll = payrollPeriods.length;
            }

            // Calculate total
            approvals.summary.total =
                approvals.summary.leave +
                approvals.summary.feeDiscount +
                approvals.summary.library +
                approvals.summary.payroll;

            return approvals;
        }, 60); // Cache for 60 seconds

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching approvals:", error);
        return NextResponse.json(
            { error: "Failed to fetch approvals", details: error.message },
            { status: 500 }
        );
    }
}

// POST - Approve or reject an item
export async function POST(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const {
            itemId,
            type, // 'leave', 'fee_discount', 'library', 'payroll'
            action, // 'approve' or 'reject'
            reason, // Required for rejection
            approverId, // User ID of the approver
        } = body;

        if (!itemId || !type || !action || !approverId) {
            return NextResponse.json(
                { error: "Missing required fields: itemId, type, action, approverId" },
                { status: 400 }
            );
        }

        if (action === 'reject' && !reason) {
            return NextResponse.json(
                { error: "Rejection reason is required" },
                { status: 400 }
            );
        }

        let result;
        const now = new Date();

        switch (type) {
            case 'leave':
                result = await prisma.leaveRequest.update({
                    where: { id: itemId },
                    data: {
                        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                        reviewedBy: approverId,
                        reviewedAt: now,
                        reviewRemarks: reason || null,
                    },
                });
                break;

            case 'fee_discount':
                if (action === 'approve') {
                    result = await prisma.feeDiscount.update({
                        where: { id: itemId },
                        data: {
                            approvedBy: approverId,
                            approvedDate: now,
                            remarks: reason || 'Approved',
                        },
                    });
                } else {
                    // For rejection, delete the discount request
                    result = await prisma.feeDiscount.delete({
                        where: { id: itemId },
                    });
                }
                break;

            case 'library':
                if (action === 'approve') {
                    // Find an available copy
                    const request = await prisma.libraryBookRequest.findUnique({
                        where: { id: itemId },
                        include: {
                            book: {
                                include: {
                                    copies: {
                                        where: { status: 'AVAILABLE' },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    });

                    if (!request?.book?.copies?.[0]) {
                        return NextResponse.json(
                            { error: "No available copies for this book" },
                            { status: 400 }
                        );
                    }

                    const copy = request.book.copies[0];

                    // Generate pickup code
                    const pickupCode = generatePickupCode();
                    const pickupDate = new Date();
                    pickupDate.setDate(pickupDate.getDate() + 7); // 7 days to pickup

                    result = await prisma.libraryBookRequest.update({
                        where: { id: itemId },
                        data: {
                            status: 'APPROVED',
                            approvedBy: approverId,
                            approvedDate: now,
                            copyId: copy.id,
                            pickupCode,
                            pickupDate,
                        },
                    });

                    // Reserve the copy
                    await prisma.libraryBookCopy.update({
                        where: { id: copy.id },
                        data: { status: 'RESERVED' },
                    });
                } else {
                    result = await prisma.libraryBookRequest.update({
                        where: { id: itemId },
                        data: {
                            status: 'REJECTED',
                            rejectedBy: approverId,
                            rejectedDate: now,
                            rejectionReason: reason,
                        },
                    });
                }
                break;

            case 'payroll':
                result = await prisma.payrollPeriod.update({
                    where: { id: itemId },
                    data: {
                        status: action === 'approve' ? 'APPROVED' : 'DRAFT',
                        approvedBy: action === 'approve' ? approverId : null,
                        approvedAt: action === 'approve' ? now : null,
                    },
                });
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown approval type: ${type}` },
                    { status: 400 }
                );
        }

        // Invalidate cache
        await invalidatePattern(`approvals:pending:*${schoolId}*`);
        await invalidatePattern(`${type}:*${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: `Successfully ${action}ed ${type} request`,
            result,
        });
    } catch (error) {
        console.error("Error processing approval:", error);
        return NextResponse.json(
            { error: "Failed to process approval", details: error.message },
            { status: 500 }
        );
    }
}

// Helper: Calculate time since submission
function getTimeSince(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
}

// Helper: Check if overdue
function isOverdue(date, hours = 48) {
    const now = new Date();
    const diff = now - new Date(date);
    return diff > hours * 60 * 60 * 1000;
}

// Helper: Generate pickup code
function generatePickupCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
