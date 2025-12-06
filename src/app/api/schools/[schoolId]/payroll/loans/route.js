// Loans API
// GET - List employee loans
// POST - Create new loan/advance

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET - List employee loans
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const type = searchParams.get('type');

    try {
        const cacheKey = generateKey('payroll:loans', {
            schoolId, status, employeeId, type
        });

        const loans = await remember(cacheKey, async () => {
            return prisma.employeeLoan.findMany({
                where: {
                    employee: { schoolId },
                    ...(status && { status }),
                    ...(employeeId && { employeeId }),
                    ...(type && { type })
                },
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
                            }
                        }
                    },
                    repayments: {
                        orderBy: { createdAt: 'desc' },
                        take: 5
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }, 300);

        const formattedLoans = loans.map(loan => ({
            ...loan,
            employeeName: loan.employee.user.name,
            employeeEmail: loan.employee.user.email,
            profilePicture: loan.employee.user.profilePicture,
            progress: loan.principalAmount > 0
                ? ((loan.amountPaid / loan.totalAmount) * 100).toFixed(1)
                : 0
        }));

        return NextResponse.json(formattedLoans);
    } catch (error) {
        console.error('Loans fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch loans',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Create new loan/advance
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const data = await req.json();

    const {
        employeeId,
        type,
        principalAmount,
        interestRate,
        tenure,
        startDate,
        remarks,
        approvedBy
    } = data;

    if (!employeeId || !type || !principalAmount || !tenure || !startDate) {
        return NextResponse.json({
            error: 'employeeId, type, principalAmount, tenure, and startDate are required'
        }, { status: 400 });
    }

    try {
        // Verify employee belongs to school
        const employee = await prisma.employeePayrollProfile.findUnique({
            where: { id: employeeId }
        });

        if (!employee || employee.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Employee not found'
            }, { status: 404 });
        }

        // Calculate loan details
        const rate = interestRate || 0;
        const totalAmount = principalAmount * (1 + (rate * tenure / 1200)); // Simple interest
        const emiAmount = totalAmount / tenure;

        const loan = await prisma.employeeLoan.create({
            data: {
                employeeId,
                type,
                principalAmount,
                interestRate: rate,
                totalAmount,
                emiAmount,
                tenure,
                startDate: new Date(startDate),
                amountPaid: 0,
                amountPending: totalAmount,
                status: approvedBy ? 'ACTIVE' : 'PENDING_APPROVAL',
                approvedBy,
                approvedAt: approvedBy ? new Date() : null,
                remarks
            }
        });

        // Create repayment schedule
        const repayments = [];
        const start = new Date(startDate);

        for (let i = 0; i < tenure; i++) {
            const repaymentMonth = new Date(start);
            repaymentMonth.setMonth(repaymentMonth.getMonth() + i);

            repayments.push({
                loanId: loan.id,
                amount: emiAmount,
                month: repaymentMonth.getMonth() + 1,
                year: repaymentMonth.getFullYear(),
                status: 'PENDING'
            });
        }

        await prisma.loanRepayment.createMany({
            data: repayments
        });

        // Invalidate cache
        await invalidatePattern(`payroll:loans:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Loan created successfully',
            loan: {
                ...loan,
                repaymentSchedule: repayments
            }
        });
    } catch (error) {
        console.error('Loan create error:', error);
        return NextResponse.json({
            error: 'Failed to create loan',
            details: error.message
        }, { status: 500 });
    }
}
