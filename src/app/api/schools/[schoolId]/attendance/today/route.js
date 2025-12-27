import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json(
                { error: 'Invalid schoolId', attendance: [], summary: { total: 0, present: 0, absent: 0, late: 0, percentage: 0 } },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

        // Get today's date range
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Build where clause
        const where = {
            schoolId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            },
            ...(status && { status: status.toUpperCase() })
        };

        // Fetch attendance records
        const [attendanceRecords, totalStudents] = await Promise.all([
            prisma.attendance.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profilePicture: true,
                            student: {
                                select: {
                                    name: true,
                                    class: { select: { className: true } },
                                    section: { select: { name: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { markedAt: 'desc' }, // Fixed: was createdAt
                take: 200
            }),
            prisma.student.count({
                where: {
                    schoolId,
                    user: { deletedAt: null, status: 'ACTIVE' }
                }
            })
        ]);

        // Calculate summary
        const present = attendanceRecords.filter(a => a.status === 'PRESENT').length;
        const absent = attendanceRecords.filter(a => a.status === 'ABSENT').length;
        const late = attendanceRecords.filter(a => a.status === 'LATE').length;
        const percentage = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;

        return NextResponse.json({
            summary: {
                total: totalStudents,
                present,
                absent,
                late,
                percentage
            },
            attendance: attendanceRecords.map(a => ({
                id: a.id,
                userId: a.userId,
                name: a.user?.student?.name || a.user?.name || 'Unknown',
                profilePicture: a.user?.profilePicture,
                class: a.user?.student?.class?.className || 'N/A',
                section: a.user?.student?.section?.name || 'N/A',
                status: a.status,
                markedAt: a.markedAt,
                remarks: a.remarks
            }))
        });
    } catch (error) {
        console.error('[ATTENDANCE TODAY ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch attendance', details: error.message },
            { status: 500 }
        );
    }
}
