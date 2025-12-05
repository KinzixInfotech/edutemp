// app/api/schools/[schoolId]/attendance/admin/audit-log/route.js

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        const skip = (page - 1) * limit;

        const where = {
            tableName: { in: ['Attendance', 'LeaveRequest', 'AttendanceConfig'] },
            ...(userId && { userId }),
            ...(action && { action }),
            ...(startDate && endDate && {
                timestamp: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            })
        };

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit
            }),
            prisma.auditLog.count({ where })
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Audit log error:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}