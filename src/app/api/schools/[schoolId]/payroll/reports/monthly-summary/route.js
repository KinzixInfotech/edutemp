// Monthly Summary Report API
// GET /api/schools/[schoolId]/payroll/reports/monthly-summary
// Generates complete monthly payroll summary

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    const format = searchParams.get('format') || 'json';

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

        // Get employee details
        const employeeDetails = await Promise.all(
            payrollItems.map(async (item) => {
                let staffDetails = await prisma.teachingStaff.findUnique({
                    where: { userId: item.employee.userId },
                    select: { employeeId: true, designation: true }
                });
                if (!staffDetails) {
                    staffDetails = await prisma.nonTeachingStaff.findUnique({
                        where: { userId: item.employee.userId },
                        select: { employeeId: true, designation: true }
                    });
                }
                return {
                    payrollItemId: item.id,
                    employeeId: staffDetails?.employeeId || 'N/A',
                    designation: staffDetails?.designation || item.employee.employeeType
                };
            })
        );

        const detailsMap = Object.fromEntries(
            employeeDetails.map(e => [e.payrollItemId, e])
        );

        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

        // Build detailed summary
        const employeeSummary = payrollItems.map((item, idx) => ({
            sNo: idx + 1,
            employeeId: detailsMap[item.id]?.employeeId || 'N/A',
            employeeName: item.employee.user?.name || 'Unknown',
            designation: detailsMap[item.id]?.designation || 'N/A',
            type: item.employee.employeeType,
            daysWorked: item.daysWorked,
            daysAbsent: item.daysAbsent,
            // Earnings
            basic: item.basicEarned,
            hra: item.hraEarned,
            da: item.daEarned,
            ta: item.taEarned,
            medical: item.medicalEarned,
            special: item.specialEarned,
            overtime: item.overtimeEarned,
            incentives: item.incentives,
            arrears: item.arrears,
            grossEarnings: item.grossEarnings,
            // Deductions
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
            // Net
            netSalary: item.netSalary,
            paymentStatus: item.paymentStatus
        }));

        // Calculate totals
        const totals = {
            totalEmployees: payrollItems.length,
            teachingStaff: payrollItems.filter(i => i.employee.employeeType === 'TEACHING').length,
            nonTeachingStaff: payrollItems.filter(i => i.employee.employeeType === 'NON_TEACHING').length,
            // Earning totals
            totalBasic: payrollItems.reduce((s, i) => s + i.basicEarned, 0),
            totalHra: payrollItems.reduce((s, i) => s + i.hraEarned, 0),
            totalDa: payrollItems.reduce((s, i) => s + i.daEarned, 0),
            totalTa: payrollItems.reduce((s, i) => s + i.taEarned, 0),
            totalMedical: payrollItems.reduce((s, i) => s + i.medicalEarned, 0),
            totalSpecial: payrollItems.reduce((s, i) => s + i.specialEarned, 0),
            totalOvertime: payrollItems.reduce((s, i) => s + i.overtimeEarned, 0),
            totalIncentives: payrollItems.reduce((s, i) => s + i.incentives, 0),
            totalArrears: payrollItems.reduce((s, i) => s + i.arrears, 0),
            totalGrossEarnings: payrollItems.reduce((s, i) => s + i.grossEarnings, 0),
            // Deduction totals
            totalPfEmployee: payrollItems.reduce((s, i) => s + i.pfEmployee, 0),
            totalPfEmployer: payrollItems.reduce((s, i) => s + i.pfEmployer, 0),
            totalEsiEmployee: payrollItems.reduce((s, i) => s + i.esiEmployee, 0),
            totalEsiEmployer: payrollItems.reduce((s, i) => s + i.esiEmployer, 0),
            totalProfessionalTax: payrollItems.reduce((s, i) => s + i.professionalTax, 0),
            totalTds: payrollItems.reduce((s, i) => s + i.tds, 0),
            totalLoanDeductions: payrollItems.reduce((s, i) => s + i.loanDeduction, 0),
            totalAdvanceDeductions: payrollItems.reduce((s, i) => s + i.advanceDeduction, 0),
            totalLossOfPay: payrollItems.reduce((s, i) => s + i.lossOfPay, 0),
            totalDeductions: payrollItems.reduce((s, i) => s + i.totalDeductions, 0),
            // Net totals
            totalNetSalary: payrollItems.reduce((s, i) => s + i.netSalary, 0),
            // Employer costs
            employerPfContribution: payrollItems.reduce((s, i) => s + i.pfEmployer, 0),
            employerEsiContribution: payrollItems.reduce((s, i) => s + i.esiEmployer, 0),
            totalEmployerCost: payrollItems.reduce((s, i) => s + i.grossEarnings + i.pfEmployer + i.esiEmployer, 0)
        };

        if (format === 'csv') {
            const headers = [
                'S.No', 'Employee ID', 'Name', 'Designation', 'Type', 'Days Worked', 'Days Absent',
                'Basic', 'HRA', 'DA', 'TA', 'Medical', 'Special', 'Overtime', 'Incentives', 'Arrears', 'Gross',
                'PF(Emp)', 'ESI(Emp)', 'PT', 'TDS', 'Loan', 'Advance', 'LOP', 'Total Ded',
                'Net Salary', 'Status'
            ].join(',');

            const rows = employeeSummary.map(e => [
                e.sNo, e.employeeId, `"${e.employeeName}"`, `"${e.designation}"`, e.type, e.daysWorked, e.daysAbsent,
                e.basic, e.hra, e.da, e.ta, e.medical, e.special, e.overtime, e.incentives, e.arrears, e.grossEarnings,
                e.pfEmployee, e.esiEmployee, e.professionalTax, e.tds, e.loanDeduction, e.advanceDeduction, e.lossOfPay, e.totalDeductions,
                e.netSalary, e.paymentStatus
            ].join(','));

            const csv = [headers, ...rows].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="Monthly_Summary_${monthName}_${year}.csv"`
                }
            });
        }

        return NextResponse.json({
            reportType: 'MONTHLY_SUMMARY',
            period: {
                month,
                year,
                monthName,
                startDate: period.startDate,
                endDate: period.endDate,
                totalWorkingDays: period.totalWorkingDays,
                status: period.status,
                isLocked: period.isLocked
            },
            generatedAt: new Date().toISOString(),
            employees: employeeSummary,
            totals
        });

    } catch (error) {
        console.error('Monthly summary error:', error);
        return NextResponse.json({
            error: 'Failed to generate monthly summary',
            details: error.message
        }, { status: 500 });
    }
}
