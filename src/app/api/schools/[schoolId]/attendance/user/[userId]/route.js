import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch attendance history for a user
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '30');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const month = url.searchParams.get('month'); // 1-12
    const year = url.searchParams.get('year'); // e.g., 2025

    if (!userId || !schoolId) {
        return NextResponse.json({ error: 'userId and schoolId required' }, { status: 400 });
    }

    try {
        // Build date filter if month/year provided
        let dateFilter = {};
        if (month && year) {
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
            endDate.setHours(23, 59, 59, 999);
            dateFilter = {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            };
        }

        const records = await prisma.attendance.findMany({
            where: {
                userId,
                schoolId,
                ...dateFilter
            },
            orderBy: { date: 'desc' },
            take: limit,
            skip: offset,
            select: {
                id: true,
                date: true,
                status: true,
                checkInTime: true,
                checkOutTime: true,
                workingHours: true,
                isLateCheckIn: true,
                lateByMinutes: true,
                remarks: true,
                // Include for detailed report
                deviceInfo: true,
                checkInLocation: true,
                checkOutLocation: true,
            }
        });

        const total = await prisma.attendance.count({
            where: { userId, schoolId, ...dateFilter }
        });

        return NextResponse.json({
            records,
            total,
            limit,
            offset,
            month: month ? parseInt(month) : null,
            year: year ? parseInt(year) : null,
        });
    } catch (error) {
        console.error('Get user attendance error:', error);
        return NextResponse.json({
            error: 'Failed to fetch attendance history',
            details: error.message
        }, { status: 500 });
    }
}
