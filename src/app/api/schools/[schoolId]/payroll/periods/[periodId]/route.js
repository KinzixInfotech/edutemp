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
