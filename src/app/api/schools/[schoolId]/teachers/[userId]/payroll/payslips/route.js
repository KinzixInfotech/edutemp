// Teacher Payslip History API
// GET /api/schools/[schoolId]/teachers/[userId]/payroll/payslips

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;
    const { searchParams } = new URL(req.url);

    const year = parseInt(searchParams.get('year') || new Date().getFullYear());
    const limit = parseInt(searchParams.get('limit') || '12');

    try {
        const cacheKey = generateKey('teacher:payslips', { schoolId, userId, year, limit });

        const payslips = await remember(cacheKey, async () => {
            // Get employee profile ID
            const profile = await prisma.employeePayrollProfile.findUnique({
                where: { userId },
                select: { id: true }
            });

            if (!profile) {
                return { error: 'Payroll profile not found' };
            }

            // Get payroll items
            const items = await prisma.payrollItem.findMany({
                where: {
                    employeeId: profile.id,
                    period: { year }
                },
                include: {
                    period: {
                        select: {
                            id: true,
                            month: true,
                            year: true,
                            status: true,
                            startDate: true,
                            endDate: true,
                            totalWorkingDays: true
                        }
                    }
                },
                orderBy: { period: { month: 'desc' } },
                take: limit
            });

            return items.map(item => ({
                id: item.id,
                periodId: item.period.id,
                month: item.period.month,
                year: item.period.year,
                monthName: new Date(item.period.year, item.period.month - 1).toLocaleString('default', { month: 'long' }),
                status: item.period.status,
                paymentStatus: item.paymentStatus,
                paidAt: item.paidAt,

                // Attendance
                totalWorkingDays: item.period.totalWorkingDays,
                daysWorked: item.daysWorked,
                daysAbsent: item.daysAbsent,
                daysLeave: item.daysLeave,
                daysHoliday: item.daysHoliday,
                lateCount: item.lateCount,
                halfDayCount: item.halfDayCount,
                overtimeHours: item.overtimeHours,

                // Earnings
                earnings: {
                    basic: item.basicEarned,
                    hra: item.hraEarned,
                    da: item.daEarned,
                    ta: item.taEarned,
                    medical: item.medicalEarned,
                    special: item.specialEarned,
                    overtime: item.overtimeEarned,
                    incentives: item.incentives,
                    arrears: item.arrears,
                    other: item.otherEarnings
                },
                grossEarnings: item.grossEarnings,

                // Deductions
                deductions: {
                    pf: item.pfEmployee,
                    pfEmployer: item.pfEmployer,
                    esi: item.esiEmployee,
                    esiEmployer: item.esiEmployer,
                    professionalTax: item.professionalTax,
                    tds: item.tds,
                    loan: item.loanDeduction,
                    advance: item.advanceDeduction,
                    lossOfPay: item.lossOfPay,
                    other: item.otherDeductions
                },
                totalDeductions: item.totalDeductions,

                // Net
                netSalary: item.netSalary
            }));
        }, 300);

        if (payslips.error) {
            return NextResponse.json({ error: payslips.error }, { status: 404 });
        }

        return NextResponse.json({ payslips, year });
    } catch (error) {
        console.error('Teacher payslips fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch payslips',
            details: error.message
        }, { status: 500 });
    }
}
