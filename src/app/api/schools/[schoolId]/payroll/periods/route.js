// Payroll Periods API
// GET - List all payroll periods
// POST - Create new payroll period

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET - List all payroll periods for school
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '12');

    try {
        const cacheKey = generateKey('payroll:periods', { schoolId, year, status, limit });

        // Parse comma-separated status values
        const statusArray = status ? status.split(',').map(s => s.trim()) : null;

        const periods = await prisma.payrollPeriod.findMany({
            where: {
                schoolId,
                ...(year && { year: parseInt(year) }),
                ...(statusArray && { status: { in: statusArray } })
            },
            include: {
                _count: {
                    select: { payrollItems: true }
                }
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            take: limit
        });

        // Get active employee count for all periods
        const activeEmployeeCount = await prisma.employeePayrollProfile.count({
            where: { schoolId, isActive: true }
        });

        // Format periods
        const formattedPeriods = periods.map(p => ({
            ...p,
            // Always show active employees count for consistency
            // (processed count is misleading - it excludes missing employees)
            employeeCount: activeEmployeeCount,
            processedCount: p._count.payrollItems,
            isLocked: p.isLocked || false,
            monthName: new Date(p.year, p.month - 1).toLocaleString('default', { month: 'long' }),
            periodLabel: `${new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short' })} ${p.year}`
        }));

        return NextResponse.json(formattedPeriods);
    } catch (error) {
        console.error('Payroll periods fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch payroll periods',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Create new payroll period
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const data = await req.json();

    const { month, year } = data;

    if (!month || !year) {
        return NextResponse.json({
            error: 'month and year are required'
        }, { status: 400 });
    }

    try {
        // Check if period already exists
        const existing = await prisma.payrollPeriod.findUnique({
            where: {
                schoolId_month_year: { schoolId, month, year }
            }
        });

        if (existing) {
            return NextResponse.json({
                error: 'Payroll period already exists for this month'
            }, { status: 400 });
        }

        // Calculate period dates
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month

        // Get working days from school calendar
        const schoolCalendar = await prisma.schoolCalendar.findMany({
            where: {
                schoolId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        let workingDays = 0;
        let holidays = 0;
        let weekends = 0;

        // Calculate working days
        const totalDays = endDate.getDate();
        for (let d = 1; d <= totalDays; d++) {
            const currentDate = new Date(year, month - 1, d);
            const dayOfWeek = currentDate.getDay();

            // Check if it's in calendar
            const calendarEntry = schoolCalendar.find(
                c => c.date.getDate() === d
            );

            if (calendarEntry) {
                if (calendarEntry.dayType === 'WORKING_DAY') {
                    workingDays++;
                } else if (calendarEntry.dayType === 'HOLIDAY') {
                    holidays++;
                } else if (calendarEntry.dayType === 'WEEKEND') {
                    weekends++;
                }
            } else {
                // Default logic if no calendar entry
                if (dayOfWeek === 0) { // Sunday
                    weekends++;
                } else {
                    workingDays++;
                }
            }
        }

        const period = await prisma.payrollPeriod.create({
            data: {
                schoolId,
                month,
                year,
                startDate,
                endDate,
                totalWorkingDays: workingDays,
                holidays,
                weekends,
                status: 'DRAFT'
            }
        });

        // Invalidate cache
        await invalidatePattern(`payroll:periods:*schoolId:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Payroll period created',
            period
        });
    } catch (error) {
        console.error('Payroll period create error:', error);
        return NextResponse.json({
            error: 'Failed to create payroll period',
            details: error.message
        }, { status: 500 });
    }
}
