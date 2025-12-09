// Teacher Loans API
// GET /api/schools/[schoolId]/teachers/[userId]/payroll/loans

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;

    try {
        const cacheKey = generateKey('teacher:loans', { schoolId, userId });

        const result = await remember(cacheKey, async () => {
            // Get employee profile ID
            const profile = await prisma.employeePayrollProfile.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!profile) {
                return { error: 'Payroll profile not found' };
            }
            // Get all loans for this employee
            const loans = await prisma.employeeLoan.findMany({
                where: { employeeId: profile.id },
                include: {
                    repayments: {
                        orderBy: [{ year: 'desc' }, { month: 'desc' }],
                        select: {
                            id: true,
                            amount: true,
                            month: true,
                            year: true,
                            status: true,
                            paidAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Calculate summary
            const activeLoanCount = loans.filter(l => l.status === 'ACTIVE').length;
            const totalPending = loans
                .filter(l => l.status === 'ACTIVE')
                .reduce((sum, l) => sum + l.amountPending, 0);
            const totalPaid = loans.reduce((sum, l) => sum + l.amountPaid, 0);
            const monthlyEmi = loans
                .filter(l => l.status === 'ACTIVE')
                .reduce((sum, l) => sum + l.emiAmount, 0);

            return {
                loans: loans.map(loan => ({
                    id: loan.id,
                    type: loan.type,
                    typeName: getLoanTypeName(loan.type),
                    principalAmount: loan.principalAmount,
                    interestRate: loan.interestRate,
                    totalAmount: loan.totalAmount,
                    emiAmount: loan.emiAmount,
                    tenure: loan.tenure,
                    startDate: loan.startDate,
                    amountPaid: loan.amountPaid,
                    amountPending: loan.amountPending,
                    status: loan.status,
                    progress: loan.totalAmount > 0
                        ? Math.round((loan.amountPaid / loan.totalAmount) * 100)
                        : 0,
                    repayments: loan.repayments.map(r => ({
                        ...r,
                        monthName: new Date(r.year, r.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })
                    })),
                    remarks: loan.remarks,
                    createdAt: loan.createdAt
                })),
                summary: {
                    activeLoanCount,
                    totalPending,
                    totalPaid,
                    monthlyEmi
                }
            };
        }, 300);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Teacher loans fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch loans',
            details: error.message
        }, { status: 500 });
    }
}

function getLoanTypeName(type) {
    const names = {
        SALARY_ADVANCE: 'Salary Advance',
        PERSONAL_LOAN: 'Personal Loan',
        EMERGENCY_LOAN: 'Emergency Loan',
        FESTIVAL_ADVANCE: 'Festival Advance'
    };
    return names[type] || type;
}
