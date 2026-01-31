// Payroll Period Lock/Unlock API
// POST /api/schools/[schoolId]/payroll/periods/[periodId]/lock - Lock payroll
// DELETE /api/schools/[schoolId]/payroll/periods/[periodId]/lock - Unlock payroll

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

// POST - Lock payroll period
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;
    const body = await req.json().catch(() => ({}));

    try {
        // Get the period
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId }
        });

        if (!period) {
            return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
        }

        if (period.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (period.isLocked) {
            return NextResponse.json({ error: 'Payroll period is already locked' }, { status: 400 });
        }

        // Only allow locking if status is PAID
        if (period.status !== 'PAID') {
            return NextResponse.json({
                error: 'Payroll must be in PAID status before locking'
            }, { status: 400 });
        }

        // Lock the period
        const updatedPeriod = await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: {
                isLocked: true,
                lockedAt: new Date(),
                lockedBy: body.userId || null,
                lockedReason: body.reason || 'Payroll finalized'
            }
        });

        // Log the action
        if (body.userId) {
            await prisma.payrollAuditLog.create({
                data: {
                    schoolId,
                    action: 'UPDATE',
                    entityType: 'PAYROLL_PERIOD',
                    entityId: periodId,
                    performedBy: body.userId,
                    performerName: body.userName || 'System',
                    description: `Locked payroll for ${getMonthName(period.month)} ${period.year}`,
                    newData: { isLocked: true, lockedAt: new Date() }
                }
            });
        }

        // Invalidate cache
        await invalidatePattern(`payroll-periods:${schoolId}*`);
        await invalidatePattern(`payroll-dashboard:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Payroll period locked successfully',
            period: updatedPeriod
        });

    } catch (error) {
        console.error('Lock payroll error:', error);
        return NextResponse.json({
            error: 'Failed to lock payroll',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Unlock payroll period (requires reason)
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    const reason = searchParams.get('reason');

    if (!reason) {
        return NextResponse.json({
            error: 'Unlock reason is required'
        }, { status: 400 });
    }

    try {
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId }
        });

        if (!period) {
            return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
        }

        if (period.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (!period.isLocked) {
            return NextResponse.json({ error: 'Payroll period is not locked' }, { status: 400 });
        }

        // Unlock the period
        const updatedPeriod = await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: {
                isLocked: false,
                lockedAt: null,
                lockedBy: null,
                lockedReason: null
            }
        });

        // Log the action with reason
        if (userId) {
            await prisma.payrollAuditLog.create({
                data: {
                    schoolId,
                    action: 'UPDATE',
                    entityType: 'PAYROLL_PERIOD',
                    entityId: periodId,
                    performedBy: userId,
                    performerName: userName || 'System',
                    description: `Unlocked payroll for ${getMonthName(period.month)} ${period.year}. Reason: ${reason}`,
                    previousData: { isLocked: true, lockedAt: period.lockedAt },
                    newData: { isLocked: false, unlockReason: reason }
                }
            });
        }

        // Invalidate cache
        await invalidatePattern(`payroll-periods:${schoolId}*`);
        await invalidatePattern(`payroll-dashboard:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Payroll period unlocked successfully',
            period: updatedPeriod
        });

    } catch (error) {
        console.error('Unlock payroll error:', error);
        return NextResponse.json({
            error: 'Failed to unlock payroll',
            details: error.message
        }, { status: 500 });
    }
}

function getMonthName(month) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || 'Unknown';
}
