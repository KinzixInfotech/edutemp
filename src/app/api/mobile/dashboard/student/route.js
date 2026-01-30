import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember } from '@/lib/cache';

/**
 * GET /api/mobile/dashboard/student
 * Consolidated dashboard API for Student role
 * Returns: notices, attendance, exams, homework, events in single response
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

        // Execute all queries in parallel for maximum speed
        const [
            noticesData,
            attendanceData,
            examsData,
            homeworkData,
            eventsData,
            studentData
        ] = await Promise.all([
            // 1. Recent Notices
            fetchNotices(schoolId, userId),
            // 2. Attendance Stats
            fetchAttendanceStats(schoolId, userId, month, year),
            // 3. Exam Results
            fetchExamResults(schoolId, userId),
            // 4. Homework
            fetchHomework(userId),
            // 5. Upcoming Events
            fetchUpcomingEvents(schoolId),
            // 6. Student basic info (for class/section context)
            fetchStudentInfo(userId)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                notices: noticesData,
                attendance: attendanceData,
                exams: examsData,
                homework: homeworkData,
                events: eventsData,
                student: studentData
            }
        });

    } catch (error) {
        console.error('Student dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: error.message },
            { status: 500 }
        );
    }
}

// Helper functions for parallel data fetching

async function fetchNotices(schoolId, userId) {
    try {
        const notices = await prisma.notice.findMany({
            where: {
                schoolId,
                OR: [
                    { targetAudience: 'ALL' },
                    { targetAudience: 'STUDENTS' },
                    {
                        noticeRecipients: {
                            some: { userId }
                        }
                    }
                ]
            },
            orderBy: { createdAt: 'desc' },
            take: 4,
            select: {
                id: true,
                title: true,
                createdAt: true,
                noticeRecipients: {
                    where: { userId },
                    select: { isRead: true }
                }
            }
        });

        return notices.map(n => ({
            id: n.id,
            title: n.title,
            time: n.createdAt,
            unread: !n.noticeRecipients?.[0]?.isRead
        }));
    } catch (error) {
        console.error('fetchNotices error:', error);
        return [];
    }
}

async function fetchAttendanceStats(schoolId, userId, month, year) {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const [attendanceRecords, workingDays] = await Promise.all([
            prisma.attendance.findMany({
                where: {
                    schoolId,
                    studentId: userId,
                    date: { gte: startDate, lte: endDate }
                },
                select: { status: true }
            }),
            prisma.schoolCalendar.count({
                where: {
                    schoolId,
                    date: { gte: startDate, lte: endDate },
                    isWorkingDay: true
                }
            })
        ]);

        const present = attendanceRecords.filter(a => a.status === 'PRESENT').length;
        const absent = attendanceRecords.filter(a => a.status === 'ABSENT').length;
        const total = workingDays || attendanceRecords.length;

        return {
            monthlyStats: {
                attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
                totalPresent: present,
                totalAbsent: absent,
                totalWorkingDays: total
            }
        };
    } catch (error) {
        console.error('fetchAttendanceStats error:', error);
        return { monthlyStats: { attendancePercentage: 0, totalPresent: 0, totalAbsent: 0, totalWorkingDays: 0 } };
    }
}

async function fetchExamResults(schoolId, userId) {
    try {
        const results = await prisma.examResult.findMany({
            where: {
                studentId: userId,
                exam: { schoolId }
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                exam: {
                    select: { name: true, examDate: true, totalMarks: true }
                }
            }
        });

        const totalExams = results.length;
        const totalPassed = results.filter(r => r.isPassed).length;
        const avgPercentage = totalExams > 0
            ? Math.round(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalExams)
            : 0;

        return {
            results: results.map(r => ({
                id: r.id,
                examName: r.exam?.name,
                examDate: r.exam?.examDate,
                marksObtained: r.marksObtained,
                totalMarks: r.exam?.totalMarks,
                percentage: r.percentage,
                isPassed: r.isPassed,
                createdAt: r.createdAt
            })),
            stats: {
                totalExams,
                totalPassed,
                avgPercentage
            }
        };
    } catch (error) {
        console.error('fetchExamResults error:', error);
        return { results: [], stats: { totalExams: 0, totalPassed: 0, avgPercentage: 0 } };
    }
}

async function fetchHomework(userId) {
    try {
        // Get student's class info first
        const student = await prisma.student.findFirst({
            where: { userId },
            select: { classId: true, sectionId: true }
        });

        if (!student) return [];

        const homework = await prisma.homework.findMany({
            where: {
                OR: [
                    { classId: student.classId, sectionId: student.sectionId },
                    { classId: student.classId, sectionId: null }
                ],
                dueDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            },
            orderBy: { dueDate: 'desc' },
            take: 20,
            include: {
                submissions: {
                    where: { studentId: userId },
                    select: { status: true }
                },
                subject: { select: { name: true } }
            }
        });

        return homework.map(hw => ({
            id: hw.id,
            title: hw.title,
            subject: hw.subject?.name,
            dueDate: hw.dueDate,
            status: hw.submissions?.[0]?.status || 'PENDING',
            createdAt: hw.createdAt
        }));
    } catch (error) {
        console.error('fetchHomework error:', error);
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

async function fetchStudentInfo(userId) {
    try {
        const student = await prisma.student.findFirst({
            where: { userId },
            select: {
                id: true,
                name: true,
                admissionNo: true,
                class: { select: { id: true, className: true } },
                section: { select: { id: true, name: true } }
            }
        });
        return student;
    } catch (error) {
        console.error('fetchStudentInfo error:', error);
        return null;
    }
}
