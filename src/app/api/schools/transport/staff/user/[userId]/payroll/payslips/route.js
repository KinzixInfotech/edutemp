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
        const staff = await prisma.transportStaff.findFirst({
            where: { userId, schoolId },
            select: { employeeId: true }
        });

        if (!staff) {
            return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
        }

        const payslips = await prisma.payslip.findMany({
            where: { employeeId: staff.employeeId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 12 // Last 12 payslips
        });

        const formattedPayslips = payslips.map(p => ({
            id: p.id,
            month: p.month,
            year: p.year,
            monthName: new Date(2000, p.month - 1).toLocaleString('default', { month: 'long' }),
            netSalary: p.netSalary,
            grossEarnings: p.grossEarnings,
            totalDeductions: p.totalDeductions,
            daysWorked: p.attendanceSummary?.daysWorked || 0,
            paymentStatus: p.status === 'PAID' ? 'PAID' : 'PENDING', // Assuming 'status' column exists
        }));

        return NextResponse.json({ payslips: formattedPayslips });

    } catch (error) {
        console.error('Transport payslips fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch payslips' }, { status: 500 });
    }
}
