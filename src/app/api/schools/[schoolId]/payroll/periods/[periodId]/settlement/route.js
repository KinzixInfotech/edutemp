// Settlement Confirmation API
// POST /api/schools/[schoolId]/payroll/periods/[periodId]/settlement
// Mark payroll period as settled after bank transfer confirmation

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from "@/lib/cache";
import { notifyTeachers } from '@/lib/notifications/notificationHelper';

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;
    const { confirmedBy, bankTransferReference, remarks } = await req.json();

    if (!confirmedBy) {
        return NextResponse.json({
            error: 'confirmedBy is required'
        }, { status: 400 });
    }

    try {
        // Get period with validation
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId }
        });

        if (!period) {
            return NextResponse.json({
                error: 'Payroll period not found'
            }, { status: 404 });
        }

        if (period.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        // Can only confirm settlement for approved periods
        if (!['APPROVED', 'PAID'].includes(period.status)) {
            return NextResponse.json({
                error: 'Settlement can only be confirmed for approved periods'
            }, { status: 400 });
        }

        // Update period with settlement info
        const updatedPeriod = await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: {
                status: 'PAID',
                paidAt: new Date(),
                settlementConfirmedAt: new Date(),
                settlementConfirmedBy: confirmedBy,
                bankTransferReference: bankTransferReference || null
            }
        });

        // Update all payroll items to PROCESSED
        await prisma.payrollItem.updateMany({
            where: {
                periodId,
                paymentStatus: { in: ['PENDING', 'PROCESSING'] }
            },
            data: {
                paymentStatus: 'PROCESSED',
                paidAt: new Date()
            }
        });

        // Get school name for notification
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true }
        });

        const monthName = new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long' });

        // Notify all teachers about salary credit
        await notifyTeachers({
            schoolId,
            title: '💰 Salary Credited',
            message: `Your salary for ${monthName} ${period.year} has been credited to your bank account.`,
            senderId: confirmedBy,
            metadata: {
                type: 'PAYROLL_SETTLEMENT',
                periodId,
                month: period.month,
                year: period.year
            }
        });

        // Create audit log
        await prisma.payrollAuditLog.create({
            data: {
                schoolId,
                action: 'PAY',
                entityType: 'PAYROLL_PERIOD',
                entityId: periodId,
                performedBy: confirmedBy,
                performerName: 'Admin', // Could fetch actual name
                description: `Settlement confirmed for ${monthName} ${period.year}${bankTransferReference ? ` (Ref: ${bankTransferReference})` : ''}`,
                newData: {
                    settlementConfirmedAt: new Date(),
                    bankTransferReference,
                    remarks
                }
            }
        });

        // Invalidate cache
        await invalidatePattern(`payroll:periods:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Settlement confirmed successfully',
            period: {
                id: updatedPeriod.id,
                status: updatedPeriod.status,
                settlementConfirmedAt: updatedPeriod.settlementConfirmedAt,
                bankTransferReference: updatedPeriod.bankTransferReference
            }
        });
    } catch (error) {
        console.error('Settlement confirmation error:', error);
        return NextResponse.json({
            error: 'Failed to confirm settlement',
            details: error.message
        }, { status: 500 });
    }
}

// GET - Check settlement status
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;

    try {
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId },
            select: {
                id: true,
                status: true,
                paidAt: true,
                settlementConfirmedAt: true,
                settlementConfirmedBy: true,
                bankTransferReference: true,
                bankSlipGeneratedAt: true
            }
        });

        if (!period) {
            return NextResponse.json({
                error: 'Payroll period not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            isSettled: period.status === 'PAID' && period.settlementConfirmedAt !== null,
            ...period
        });
    } catch (error) {
        console.error('Settlement status error:', error);
        return NextResponse.json({
            error: 'Failed to get settlement status',
            details: error.message
        }, { status: 500 });
    }
}
