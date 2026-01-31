// Deductions Export API
// GET /api/schools/[schoolId]/payroll/exports/deductions
// Export all deductions breakdown for a period

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    const format = searchParams.get('format') || 'csv';

    if (!month || !year) {
        return NextResponse.json({
            error: 'Month and year are required'
        }, { status: 400 });
    }

    try {
        const period = await prisma.payrollPeriod.findUnique({
            where: {
                schoolId_month_year: { schoolId, month, year }
            }
        });

        if (!period) {
            return NextResponse.json({
                error: 'Payroll period not found'
            }, { status: 404 });
        }

        const payrollItems = await prisma.payrollItem.findMany({
            where: { periodId: period.id },
            include: {
                employee: {
                    include: {
                        user: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { employee: { user: { name: 'asc' } } }
        });

        // Get employee IDs
        const employeeDetails = await Promise.all(
            payrollItems.map(async (item) => {
                let staffDetails = await prisma.teachingStaff.findUnique({
                    where: { userId: item.employee.userId },
                    select: { employeeId: true }
                });
                if (!staffDetails) {
                    staffDetails = await prisma.nonTeachingStaff.findUnique({
                        where: { userId: item.employee.userId },
                        select: { employeeId: true }
                    });
                }
                return {
                    payrollItemId: item.id,
                    employeeId: staffDetails?.employeeId || 'N/A'
                };
            })
        );

        const employeeIdMap = Object.fromEntries(
            employeeDetails.map(e => [e.payrollItemId, e.employeeId])
        );

        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

        const deductionsData = payrollItems.map((item, idx) => ({
            sNo: idx + 1,
            employeeId: employeeIdMap[item.id] || 'N/A',
            employeeName: item.employee.user?.name || 'Unknown',
            grossEarnings: item.grossEarnings,
            pfEmployee: item.pfEmployee,
            pfEmployer: item.pfEmployer,
            esiEmployee: item.esiEmployee,
            esiEmployer: item.esiEmployer,
            professionalTax: item.professionalTax,
            tds: item.tds,
            loanDeduction: item.loanDeduction,
            advanceDeduction: item.advanceDeduction,
            lossOfPay: item.lossOfPay,
            totalDeductions: item.totalDeductions,
            netSalary: item.netSalary
        }));

        const totals = {
            totalGross: deductionsData.reduce((s, r) => s + r.grossEarnings, 0),
            totalPfEmployee: deductionsData.reduce((s, r) => s + r.pfEmployee, 0),
            totalPfEmployer: deductionsData.reduce((s, r) => s + r.pfEmployer, 0),
            totalEsiEmployee: deductionsData.reduce((s, r) => s + r.esiEmployee, 0),
            totalEsiEmployer: deductionsData.reduce((s, r) => s + r.esiEmployer, 0),
            totalPT: deductionsData.reduce((s, r) => s + r.professionalTax, 0),
            totalTds: deductionsData.reduce((s, r) => s + r.tds, 0),
            totalLoan: deductionsData.reduce((s, r) => s + r.loanDeduction, 0),
            totalAdvance: deductionsData.reduce((s, r) => s + r.advanceDeduction, 0),
            totalLop: deductionsData.reduce((s, r) => s + r.lossOfPay, 0),
            totalDeductions: deductionsData.reduce((s, r) => s + r.totalDeductions, 0),
            totalNet: deductionsData.reduce((s, r) => s + r.netSalary, 0)
        };

        if (format === 'csv') {
            const headers = [
                'S.No', 'Employee ID', 'Name', 'Gross Earnings',
                'PF (Employee)', 'PF (Employer)', 'ESI (Employee)', 'ESI (Employer)',
                'Professional Tax', 'TDS', 'Loan', 'Advance', 'LOP',
                'Total Deductions', 'Net Salary'
            ].join(',');

            const rows = deductionsData.map(d => [
                d.sNo, d.employeeId, `"${d.employeeName}"`, d.grossEarnings,
                d.pfEmployee, d.pfEmployer, d.esiEmployee, d.esiEmployer,
                d.professionalTax, d.tds, d.loanDeduction, d.advanceDeduction, d.lossOfPay,
                d.totalDeductions, d.netSalary
            ].join(','));

            const totalRow = [
                '', '', 'TOTAL', totals.totalGross,
                totals.totalPfEmployee, totals.totalPfEmployer, totals.totalEsiEmployee, totals.totalEsiEmployer,
                totals.totalPT, totals.totalTds, totals.totalLoan, totals.totalAdvance, totals.totalLop,
                totals.totalDeductions, totals.totalNet
            ].join(',');

            const csv = [headers, ...rows, totalRow].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="Deductions_Summary_${monthName}_${year}.csv"`
                }
            });
        }

        return NextResponse.json({
            exportType: 'DEDUCTIONS_SUMMARY',
            period: { month, year, monthName },
            generatedAt: new Date().toISOString(),
            employeeCount: deductionsData.length,
            deductions: deductionsData,
            totals
        });

    } catch (error) {
        console.error('Deductions export error:', error);
        return NextResponse.json({
            error: 'Failed to export deductions',
            details: error.message
        }, { status: 500 });
    }
}
