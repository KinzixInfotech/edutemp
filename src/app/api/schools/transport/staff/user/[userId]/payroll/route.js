import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!userId || !schoolId) {
        return NextResponse.json({ error: 'Missing userId or schoolId' }, { status: 400 });
    }

    try {
        // 1. Get Transport Staff details to get employeeId
        const staff = await prisma.transportStaff.findFirst({
            where: { userId, schoolId },
            select: { id: true, employeeId: true, name: true }
        });

        if (!staff) {
            return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
        }

        // 2. Fetch latest payslip
        const latestPayslip = await prisma.payslip.findFirst({
            where: { employeeId: staff.employeeId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });

        // 3. Fetch YTD (Year To Date) stats
        const currentYear = new Date().getFullYear();
        const ytdPayslips = await prisma.payslip.findMany({
            where: {
                employeeId: staff.employeeId,
                year: currentYear
            },
            select: {
                grossEarnings: true,
                netSalary: true,
                totalDeductions: true,
                details: true // Assuming details acts as JSON for tax/pf if needed, or schema has specific columns
            }
        });

        const ytd = ytdPayslips.reduce((acc, p) => ({
            grossEarnings: acc.grossEarnings + (p.grossEarnings || 0),
            netSalary: acc.netSalary + (p.netSalary || 0),
            totalDeductions: acc.totalDeductions + (p.totalDeductions || 0),
            pfContribution: acc.pfContribution, // Add logic if available in schema
            tds: acc.tds // Add logic if available
        }), { year: currentYear, grossEarnings: 0, netSalary: 0, totalDeductions: 0, pfContribution: 0, tds: 0 });

        // 4. Return formatted data compatible with payroll screen
        return NextResponse.json({
            profile: {
                name: staff.name,
                employeeId: staff.employeeId,
            },
            latestPayslip: latestPayslip || null,
            ytd,
            loansEnabled: false, // For now
            salaryStructure: null // Complex to fetch if not linked to standard employee structure
        });

    } catch (error) {
        console.error('Transport payroll fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch payroll data' }, { status: 500 });
    }
}
