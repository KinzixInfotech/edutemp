// ESI Report API
// GET /api/schools/[schoolId]/payroll/reports/esi
// Generates ESI (Employee State Insurance) report for a given period

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ESI eligibility threshold (as per 2024 rules)
const ESI_THRESHOLD = 21000;
const ESI_EMPLOYEE_RATE = 0.75; // 0.75% of gross
const ESI_EMPLOYER_RATE = 3.25; // 3.25% of gross

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

        if (!['APPROVED', 'PAID'].includes(period.status)) {
            return NextResponse.json({
                error: 'Payroll must be approved to generate reports'
            }, { status: 400 });
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

        // Build ESI report - only include employees under threshold
        const esiData = payrollItems
            .filter(item => item.esiEmployee > 0 || item.esiEmployer > 0)
            .map(item => ({
                sNo: null,
                employeeId: employeeIdMap[item.id] || 'N/A',
                employeeName: item.employee.user?.name || 'Unknown',
                esicNumber: item.employee.esicNumber || 'N/A',
                grossWages: item.grossEarnings,
                daysWorked: item.daysWorked,
                esiEmployeeContribution: item.esiEmployee,
                esiEmployerContribution: item.esiEmployer,
                totalEsi: item.esiEmployee + item.esiEmployer,
                isEligible: item.grossEarnings <= ESI_THRESHOLD
            }));

        esiData.forEach((row, idx) => { row.sNo = idx + 1; });

        // Employees NOT eligible for ESI (above threshold)
        const nonEligible = payrollItems
            .filter(item => item.grossEarnings > ESI_THRESHOLD)
            .map(item => ({
                employeeId: employeeIdMap[item.id] || 'N/A',
                employeeName: item.employee.user?.name || 'Unknown',
                grossWages: item.grossEarnings,
                reason: `Gross salary ₹${item.grossEarnings.toLocaleString('en-IN')} exceeds ESI threshold of ₹${ESI_THRESHOLD.toLocaleString('en-IN')}`
            }));

        const totals = {
            eligibleEmployees: esiData.length,
            totalGrossWages: esiData.reduce((sum, r) => sum + r.grossWages, 0),
            totalEmployeeContribution: esiData.reduce((sum, r) => sum + r.esiEmployeeContribution, 0),
            totalEmployerContribution: esiData.reduce((sum, r) => sum + r.esiEmployerContribution, 0),
            grandTotal: esiData.reduce((sum, r) => sum + r.totalEsi, 0),
            nonEligibleCount: nonEligible.length
        };

        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

        if (format === 'csv') {
            const headers = [
                'S.No', 'Employee ID', 'Employee Name', 'ESIC Number', 'Gross Wages',
                'Days Worked', 'Employee ESI', 'Employer ESI', 'Total ESI'
            ].join(',');

            const rows = esiData.map(r => [
                r.sNo, r.employeeId, `"${r.employeeName}"`, r.esicNumber,
                r.grossWages, r.daysWorked,
                r.esiEmployeeContribution, r.esiEmployerContribution, r.totalEsi
            ].join(','));

            const totalRow = [
                '', '', 'TOTAL', '',
                totals.totalGrossWages, '',
                totals.totalEmployeeContribution, totals.totalEmployerContribution, totals.grandTotal
            ].join(',');

            const csv = [headers, ...rows, totalRow].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="ESI_Report_${monthName}_${year}.csv"`
                }
            });
        }

        return NextResponse.json({
            reportType: 'ESI_REPORT',
            period: { month, year, monthName },
            generatedAt: new Date().toISOString(),
            esiThreshold: ESI_THRESHOLD,
            rates: {
                employee: `${ESI_EMPLOYEE_RATE}%`,
                employer: `${ESI_EMPLOYER_RATE}%`
            },
            eligibleEmployees: esiData,
            nonEligibleEmployees: nonEligible,
            totals
        });

    } catch (error) {
        console.error('ESI report error:', error);
        return NextResponse.json({
            error: 'Failed to generate ESI report',
            details: error.message
        }, { status: 500 });
    }
}
