import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/dashboard/teacher
 * Consolidated dashboard API for Teacher role
 * Returns: profile, notices, attendance, leaves, delegations, events in single response
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');
        const userId = searchParams.get('userId');

        if (!schoolId || !userId) {
            return NextResponse.json(
                { error: 'Missing required parameters: schoolId, userId' },
                { status: 400 }
            );
        }

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // Execute all queries in parallel
        const [
            teacherData,
            noticesData,
            attendanceData,
            leavesData,
            delegationsData,
            eventsData
        ] = await Promise.all([
            fetchTeacherProfile(schoolId, userId),
            fetchNotices(schoolId, userId),
            fetchTeacherAttendance(schoolId, userId, month, year),
            fetchLeaveBalance(schoolId, userId),
            fetchDelegations(schoolId, userId),
            fetchUpcomingEvents(schoolId)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                teacher: teacherData,
                notices: noticesData,
                attendance: attendanceData,
                leaves: leavesData,
                delegations: delegationsData,
                events: eventsData
            }
        });

    } catch (error) {
        console.error('Teacher dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: error.message },
            { status: 500 }
        );
    }
}

async function fetchTeacherProfile(schoolId, userId) {
    try {
        const teacher = await prisma.teachingStaff.findUnique({
            where: { userId },
            include: {
                user: { select: { name: true, email: true, profilePicture: true } },
                department: { select: { id: true, name: true } },
                subjects: { select: { id: true, subjectName: true, subjectCode: true } },
                sectionsAssigned: {
                    include: {
                        class: { select: { id: true, className: true } }
                    }
                }
            }
        });

        if (!teacher) return null;

        return {
            id: teacher.userId,
            name: teacher.name,
            email: teacher.user?.email,
            employeeId: teacher.employeeId,
            designation: teacher.designation,
            department: teacher.department,
            subjects: teacher.subjects,
            sectionsAssigned: teacher.sectionsAssigned,
            profilePicture: teacher.user?.profilePicture
        };
    } catch (error) {
        console.error('fetchTeacherProfile error:', error);
        return null;
    }
}

async function fetchNotices(schoolId, userId) {
    try {
        // Fetch notices where audience is ALL, TEACHERS, or STAFF
        const notices = await prisma.notice.findMany({
            where: {
                schoolId,
                status: 'PUBLISHED',
                OR: [
                    { audience: 'ALL' },
                    { audience: 'TEACHERS' },
                    { audience: 'STAFF' }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 4,
            select: {
                id: true,
                title: true,
                createdAt: true,
                NoticeReads: {
                    where: { userId },
                    select: { readAt: true }
                }
            }
        });

        return notices.map(n => ({
            id: n.id,
            title: n.title,
            time: n.createdAt,
            unread: n.NoticeReads.length === 0
        }));
    } catch (error) {
        console.error('fetchNotices error:', error);
        return [];
    }
}

async function fetchTeacherAttendance(schoolId, userId, month, year) {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Use Attendance model (not staffAttendance)
        const records = await prisma.attendance.findMany({
            where: {
                schoolId,
                userId,
                date: { gte: startDate, lte: endDate }
            },
            select: { status: true, date: true }
        });

        const present = records.filter(r => r.status === 'PRESENT').length;
        const absent = records.filter(r => r.status === 'ABSENT').length;
        const onLeave = records.filter(r => r.status === 'ON_LEAVE').length;
        const total = records.length;

        return {
            monthlyStats: {
                attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
                totalPresent: present,
                totalAbsent: absent,
                totalOnLeave: onLeave,
                totalDays: total
            }
        };
    } catch (error) {
        console.error('fetchTeacherAttendance error:', error);
        return { monthlyStats: { attendancePercentage: 0, totalPresent: 0, totalAbsent: 0 } };
    }
}

async function fetchLeaveBalance(schoolId, userId) {
    try {
        const balance = await prisma.leaveBalance.findFirst({
            where: { schoolId, userId },
            select: {
                casualLeaveTotal: true,
                casualLeaveUsed: true,
                casualLeaveBalance: true,
                sickLeaveTotal: true,
                sickLeaveUsed: true,
                sickLeaveBalance: true,
                earnedLeaveTotal: true,
                earnedLeaveUsed: true,
                earnedLeaveBalance: true
            }
        });

        if (!balance) return null;

        return {
            casual: {
                total: balance.casualLeaveTotal,
                used: balance.casualLeaveUsed,
                remaining: balance.casualLeaveBalance
            },
            sick: {
                total: balance.sickLeaveTotal,
                used: balance.sickLeaveUsed,
                remaining: balance.sickLeaveBalance
            },
            earned: {
                total: balance.earnedLeaveTotal,
                used: balance.earnedLeaveUsed,
                remaining: balance.earnedLeaveBalance
            }
        };
    } catch (error) {
        console.error('fetchLeaveBalance error:', error);
        return null;
    }
}

async function fetchDelegations(schoolId, userId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Use substituteTeacherId (not delegatedToId)
        const delegations = await prisma.attendanceDelegation.findMany({
            where: {
                schoolId,
                substituteTeacherId: userId,
                status: 'ACTIVE',
                startDate: { lte: today },
                endDate: { gte: today }
            },
            include: {
                originalTeacher: {
                    select: { name: true }
                },
                section: {
                    include: {
                        class: { select: { className: true } }
                    }
                },
                class: { select: { className: true } }
            }
        });

        return delegations.map(d => ({
            id: d.id,
            delegatedBy: d.originalTeacher?.name,
            class: d.class?.className || d.section?.class?.className,
            section: d.section?.name,
            startDate: d.startDate,
            endDate: d.endDate
        }));
    } catch (error) {
        console.error('fetchDelegations error:', error);
        return [];
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
