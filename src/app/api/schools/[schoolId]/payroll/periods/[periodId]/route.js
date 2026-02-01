// Individual Payroll Period API
// GET - Get payroll period details with all items

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Get payroll period with all payroll items
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;

    try {
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId },
            include: {
                payrollItems: {
                    include: {
                        employee: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        profilePicture: true
                                    }
                                },
                                salaryStructure: {
                                    select: {
                                        name: true,
                                        grossSalary: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        employee: {
                            user: { name: 'asc' }
                        }
                    }
                }
            }
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

        // Transform payroll items
        const formattedItems = period.payrollItems.map(item => ({
            ...item,
            employeeName: item.employee.user.name,
            employeeEmail: item.employee.user.email,
            profilePicture: item.employee.user.profilePicture,
            salaryStructureName: item.employee.salaryStructure?.name,
            expectedGross: item.employee.salaryStructure?.grossSalary
        }));

        return NextResponse.json({
            ...period,
            payrollItems: formattedItems,
            summary: {
                totalEmployees: formattedItems.length,
                totalGross: formattedItems.reduce((sum, i) => sum + i.grossEarnings, 0),
                totalDeductions: formattedItems.reduce((sum, i) => sum + i.totalDeductions, 0),
                totalNet: formattedItems.reduce((sum, i) => sum + i.netSalary, 0),
                pending: formattedItems.filter(i => i.paymentStatus === 'PENDING').length,
                processed: formattedItems.filter(i => i.paymentStatus === 'PROCESSED').length
            },
            validationSummary: {
                ready: formattedItems.filter(i => i.readiness === 'READY').length,
                onHoldBank: formattedItems.filter(i => i.readiness === 'ON_HOLD_BANK').length,
                onHoldApproval: formattedItems.filter(i => i.readiness === 'ON_HOLD_APPROVAL').length,
                skippedNoStructure: formattedItems.filter(i => i.readiness === 'SKIPPED_NO_STRUCTURE').length,
                total: formattedItems.length
            }
        });
    } catch (error) {
        console.error('Payroll period fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch payroll period',
            details: error.message
        }, { status: 500 });
    }
}

// PATCH - Update payroll period (blocked if locked)
export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;
    const body = await req.json();

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

        // Block modifications on locked periods
        if (period.isLocked) {
            return NextResponse.json({
                error: 'Cannot modify a locked payroll period. Please unlock it first.',
                isLocked: true
            }, { status: 423 }); // 423 Locked
        }

        // Only allow updating certain fields
        const allowedFields = ['totalWorkingDays', 'holidays', 'weekends', 'status', 'paidAt'];
        const updateData = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        if (body.status === 'PAID' && !period.paidAt) {
            updateData.paidAt = new Date();
        }

        const updatedPeriod = await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            period: updatedPeriod
        });

    } catch (error) {
        console.error('Payroll period update error:', error);
        return NextResponse.json({
            error: 'Failed to update payroll period',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Delete payroll period (blocked if locked or has paid items)
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;

    try {
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId },
            include: {
                payrollItems: {
                    where: { paymentStatus: 'PROCESSED' },
                    select: { id: true }
                }
            }
        });

        if (!period) {
            return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
        }

        if (period.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (period.isLocked) {
            return NextResponse.json({
                error: 'Cannot delete a locked payroll period'
            }, { status: 423 });
        }

        if (period.payrollItems.length > 0) {
            return NextResponse.json({
                error: 'Cannot delete payroll period with processed payments'
            }, { status: 400 });
        }

        if (['APPROVED', 'PAID'].includes(period.status)) {
            return NextResponse.json({
                error: 'Cannot delete approved or paid payroll periods'
            }, { status: 400 });
        }

        // Delete all payroll items first, then the period
        await prisma.payrollItem.deleteMany({
            where: { periodId }
        });

        await prisma.payrollPeriod.delete({
            where: { id: periodId }
        });

        return NextResponse.json({
            success: true,
            message: 'Payroll period deleted'
        });

    } catch (error) {
        console.error('Payroll period delete error:', error);
        return NextResponse.json({
            error: 'Failed to delete payroll period',
            details: error.message
        }, { status: 500 });
    }
}
