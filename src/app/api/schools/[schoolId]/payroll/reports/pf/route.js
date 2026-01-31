// PF Report API
// GET /api/schools/[schoolId]/payroll/reports/pf
// Generates PF (Provident Fund) report for a given period

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    const format = searchParams.get('format') || 'json'; // json, csv, excel

    if (!month || !year) {
        return NextResponse.json({
            error: 'Month and year are required'
        }, { status: 400 });
    }

    try {
        // Get payroll period
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

        // Get all payroll items with employee details
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

        // Get teaching/non-teaching staff details for UAN
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

        // Build PF report data
        const pfData = payrollItems
            .filter(item => item.pfEmployee > 0 || item.pfEmployer > 0)
            .map(item => ({
                sNo: null, // Will be set below
                employeeId: employeeIdMap[item.id] || 'N/A',
                employeeName: item.employee.user?.name || 'Unknown',
                uanNumber: item.employee.uanNumber || 'N/A',
                grossWages: item.grossEarnings,
                basicWages: item.basicEarned,
                pfWages: Math.min(item.basicEarned, 15000), // PF ceiling
                pfEmployeeContribution: item.pfEmployee,
                pfEmployerContribution: item.pfEmployer,
                epsContribution: Math.min(item.pfEmployer * (8.33 / 12), 1250), // EPS is 8.33% of basic, max ₹1250
                epfContribution: item.pfEmployer - Math.min(item.pfEmployer * (8.33 / 12), 1250),
                totalPf: item.pfEmployee + item.pfEmployer
            }));

        // Add serial numbers
        pfData.forEach((row, idx) => { row.sNo = idx + 1; });

        // Calculate totals
        const totals = {
            totalGrossWages: pfData.reduce((sum, r) => sum + r.grossWages, 0),
            totalBasicWages: pfData.reduce((sum, r) => sum + r.basicWages, 0),
            totalPfWages: pfData.reduce((sum, r) => sum + r.pfWages, 0),
            totalEmployeeContribution: pfData.reduce((sum, r) => sum + r.pfEmployeeContribution, 0),
            totalEmployerContribution: pfData.reduce((sum, r) => sum + r.pfEmployerContribution, 0),
            totalEps: pfData.reduce((sum, r) => sum + r.epsContribution, 0),
            totalEpf: pfData.reduce((sum, r) => sum + r.epfContribution, 0),
            grandTotal: pfData.reduce((sum, r) => sum + r.totalPf, 0)
        };

        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

        if (format === 'csv') {
            const headers = [
                'S.No', 'Employee ID', 'Employee Name', 'UAN', 'Gross Wages', 'Basic Wages',
                'PF Wages', 'Employee PF', 'Employer PF', 'EPS', 'EPF', 'Total PF'
            ].join(',');

            const rows = pfData.map(r => [
                r.sNo, r.employeeId, `"${r.employeeName}"`, r.uanNumber,
                r.grossWages, r.basicWages, r.pfWages,
                r.pfEmployeeContribution, r.pfEmployerContribution,
                r.epsContribution.toFixed(2), r.epfContribution.toFixed(2), r.totalPf
            ].join(','));

            const totalRow = [
                '', '', 'TOTAL', '',
                totals.totalGrossWages, totals.totalBasicWages, totals.totalPfWages,
                totals.totalEmployeeContribution, totals.totalEmployerContribution,
                totals.totalEps.toFixed(2), totals.totalEpf.toFixed(2), totals.grandTotal
            ].join(',');

            const csv = [headers, ...rows, totalRow].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="PF_Report_${monthName}_${year}.csv"`
                }
            });
        }

        return NextResponse.json({
            reportType: 'PF_REPORT',
            period: { month, year, monthName },
            generatedAt: new Date().toISOString(),
            employeeCount: pfData.length,
            data: pfData,
            totals
        });

    } catch (error) {
        console.error('PF report error:', error);
        return NextResponse.json({
            error: 'Failed to generate PF report',
            details: error.message
        }, { status: 500 });
    }
}
