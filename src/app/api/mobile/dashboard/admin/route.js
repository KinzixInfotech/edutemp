import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/dashboard/admin
 * Consolidated dashboard API for Director/Principal roles
 * Returns: overview stats, notices, fees summary, events in single response
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');
        const userId = searchParams.get('userId');
        const role = searchParams.get('role'); // DIRECTOR or PRINCIPAL

        if (!schoolId || !userId) {
            return NextResponse.json(
                { error: 'Missing required parameters: schoolId, userId' },
                { status: 400 }
            );
        }

        // Get active academic year first
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true }
        });

        // Execute all queries in parallel
        const [
            overviewStats,
            noticesData,
            feeSummary,
            eventsData,
            pendingApprovals
        ] = await Promise.all([
            fetchOverviewStats(schoolId, academicYear?.id),
            fetchNotices(schoolId, userId),
            fetchFeeSummary(schoolId, academicYear?.id),
            fetchUpcomingEvents(schoolId),
            fetchPendingApprovals(schoolId)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                academicYear,
                overview: overviewStats,
                notices: noticesData,
                fees: feeSummary,
                events: eventsData,
                approvals: pendingApprovals
            }
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: error.message },
            { status: 500 }
        );
    }
}

async function fetchOverviewStats(schoolId, academicYearId) {
    try {
        const [
            totalStudents,
            totalTeachers,
            totalParents,
            totalClasses,
            totalSections
        ] = await Promise.all([
            prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
            prisma.teacher.count({ where: { schoolId } }),
            prisma.parent.count({ where: { schoolId } }),
            prisma.class.count({ where: { schoolId } }),
            prisma.section.count({ where: { class: { schoolId } } })
        ]);

        // Today's attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [presentToday, absentToday] = await Promise.all([
            prisma.attendance.count({
                where: { schoolId, date: today, status: 'PRESENT' }
            }),
            prisma.attendance.count({
                where: { schoolId, date: today, status: 'ABSENT' }
            })
        ]);

        const todayTotal = presentToday + absentToday;
        const todayAttendanceRate = todayTotal > 0 ? Math.round((presentToday / todayTotal) * 100) : 0;

        return {
            totalStudents,
            totalTeachers,
            totalParents,
            totalClasses,
            totalSections,
            todayAttendance: {
                present: presentToday,
                absent: absentToday,
                rate: todayAttendanceRate
            }
        };
    } catch (error) {
        console.error('fetchOverviewStats error:', error);
        return {
            totalStudents: 0,
            totalTeachers: 0,
            totalParents: 0,
            totalClasses: 0,
            totalSections: 0,
            todayAttendance: { present: 0, absent: 0, rate: 0 }
        };
    }
}

async function fetchNotices(schoolId, userId) {
    try {
        const notices = await prisma.notice.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' },
            take: 4,
            select: {
                id: true,
                title: true,
                createdAt: true,
                sender: { select: { name: true } }
            }
        });

        return notices.map(n => ({
            id: n.id,
            title: n.title,
            time: n.createdAt,
            sender: n.sender?.name
        }));
    } catch (error) {
        console.error('fetchNotices error:', error);
        return [];
    }
}

async function fetchFeeSummary(schoolId, academicYearId) {
    try {
        if (!academicYearId) return null;

        const fees = await prisma.studentFee.aggregate({
            where: { student: { schoolId }, academicYearId },
            _sum: {
                originalAmount: true,
                paidAmount: true,
                balanceAmount: true
            }
        });

        const totalFees = fees._sum.originalAmount || 0;
        const collected = fees._sum.paidAmount || 0;
        const pending = fees._sum.balanceAmount || 0;
        const collectionRate = totalFees > 0 ? Math.round((collected / totalFees) * 100) : 0;

        return {
            totalFees,
            collected,
            pending,
            collectionRate
        };
    } catch (error) {
        console.error('fetchFeeSummary error:', error);
        return null;
    }
}

async function fetchPendingApprovals(schoolId) {
    try {
        const [leaveRequests, busRequests] = await Promise.all([
            prisma.leaveRequest.count({
                where: { schoolId, status: 'PENDING' }
            }),
            prisma.transportRequest.count({
                where: { schoolId, status: 'PENDING' }
            })
        ]);

        return {
            leaveRequests,
            busRequests,
            total: leaveRequests + busRequests
        };
    } catch (error) {
        console.error('fetchPendingApprovals error:', error);
        return { leaveRequests: 0, busRequests: 0, total: 0 };
    }
}

async function fetchUpcomingEvents(schoolId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const events = await prisma.calendarEvent.findMany({
            where: {
                schoolId,
                startDate: { gte: today }
            },
            orderBy: { startDate: 'asc' },
            take: 5,
            select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                category: true,
                color: true,
                location: true,
                isAllDay: true
            }
        });

        return events;
    } catch (error) {
        console.error('fetchUpcomingEvents error:', error);
        return [];
    }
}
