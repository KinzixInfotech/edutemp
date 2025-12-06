// Approve Payroll API
// POST - Approve payroll period

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from "@/lib/cache";

// POST - Approve payroll
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;
    const { approvedBy, action, remarks } = await req.json();

    if (!approvedBy || !action) {
        return NextResponse.json({
            error: 'approvedBy and action are required'
        }, { status: 400 });
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
        return NextResponse.json({
            error: 'action must be APPROVE or REJECT'
        }, { status: 400 });
    }

    try {
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

        if (period.status !== 'PENDING_APPROVAL') {
            return NextResponse.json({
                error: `Cannot ${action.toLowerCase()} payroll in ${period.status} status`
            }, { status: 400 });
        }

        if (action === 'APPROVE') {
            await prisma.payrollPeriod.update({
                where: { id: periodId },
                data: {
                    status: 'APPROVED',
                    approvedAt: new Date(),
                    approvedBy
                }
            });

            // Log audit
            await prisma.payrollAuditLog.create({
                data: {
                    schoolId,
                    action: 'APPROVE',
                    entityType: 'PAYROLL_PERIOD',
                    entityId: periodId,
                    performedBy: approvedBy,
                    performerName: 'Admin', // Should be fetched from user
                    description: `Payroll for ${period.month}/${period.year} approved`,
                    newData: { status: 'APPROVED' }
                }
            });

            // Invalidate cache
            await invalidatePattern(`payroll:periods:${schoolId}*`);

            return NextResponse.json({
                success: true,
                message: 'Payroll approved successfully'
            });
        } else {
            // Reject - send back to draft
            await prisma.payrollPeriod.update({
                where: { id: periodId },
                data: {
                    status: 'DRAFT'
                }
            });

            // Log audit
            await prisma.payrollAuditLog.create({
                data: {
                    schoolId,
                    action: 'REJECT',
                    entityType: 'PAYROLL_PERIOD',
                    entityId: periodId,
                    performedBy: approvedBy,
                    performerName: 'Admin',
                    description: remarks || `Payroll for ${period.month}/${period.year} rejected`
                }
            });

            // Invalidate cache
            await invalidatePattern(`payroll:periods:${schoolId}*`);

            return NextResponse.json({
                success: true,
                message: 'Payroll rejected and sent back to draft'
            });
        }
    } catch (error) {
        console.error('Payroll approval error:', error);
        return NextResponse.json({
            error: 'Failed to approve/reject payroll',
            details: error.message
        }, { status: 500 });
    }
}
