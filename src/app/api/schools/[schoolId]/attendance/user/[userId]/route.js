import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Fetch attendance history for a user
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '30');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!userId || !schoolId) {
        return NextResponse.json({ error: 'userId and schoolId required' }, { status: 400 });
    }

    try {
        const records = await prisma.attendance.findMany({
            where: {
                userId,
                schoolId,
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
            }
        });

        const total = await prisma.attendance.count({
            where: { userId, schoolId }
        });

        return NextResponse.json({
            records,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Get user attendance error:', error);
        return NextResponse.json({
            error: 'Failed to fetch attendance history',
            details: error.message
        }, { status: 500 });
    }
}
