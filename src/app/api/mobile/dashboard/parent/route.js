import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/dashboard/parent
 * Consolidated dashboard API for Parent role
 * Returns: children, notices, events, and child-specific stats (attendance, homework, exams, fees)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');
        const parentId = searchParams.get('parentId');
        const userId = searchParams.get('userId');
        const selectedChildId = searchParams.get('childId'); // Optional: for child-specific data

        if (!schoolId || !parentId) {
            return NextResponse.json(
                { error: 'Missing required parameters: schoolId, parentId' },
                { status: 400 }
            );
        }

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        // Base queries that don't depend on selected child
        const [
            childrenData,
            noticesData,
            eventsData,
            academicYearData
        ] = await Promise.all([
            fetchChildren(schoolId, parentId),
            fetchNotices(schoolId, userId || parentId),
            fetchUpcomingEvents(schoolId),
            fetchActiveAcademicYear(schoolId)
        ]);

        // If a child is selected, fetch child-specific data
        let childStats = null;
        if (selectedChildId) {
            const [attendance, homework, exams, fees] = await Promise.all([
                fetchChildAttendance(schoolId, selectedChildId, month, year),
                fetchChildHomework(schoolId, selectedChildId),
                fetchChildExams(schoolId, selectedChildId),
                fetchChildFees(selectedChildId, academicYearData?.id)
            ]);

            childStats = {
                attendance,
                homework,
                exams,
                fees
            };
        }

        return NextResponse.json({
            success: true,
            data: {
                children: childrenData,
                notices: noticesData,
                events: eventsData,
                academicYear: academicYearData,
                childStats // Will be null if no child selected
            }
        });

    } catch (error) {
        console.error('Parent dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: error.message },
            { status: 500 }
        );
    }
}

// Helper functions

async function fetchChildren(schoolId, parentId) {
    try {
        const links = await prisma.studentParentLink.findMany({
            where: { parentId },
            include: {
                student: {
                    include: {
                        user: { select: { profilePicture: true } },
                        class: { select: { id: true, className: true } },
                        section: { select: { id: true, name: true } }
                    }
                }
            }
        });

        return links.map(link => ({
            id: link.student.id,
            studentId: link.studentId,
            name: link.student.name,
            class: link.student.class?.className,
            classId: link.student.classId,
            section: link.student.section?.name,
            sectionId: link.student.sectionId,
            rollNumber: link.student.rollNumber,
            profilePicture: link.student.user?.profilePicture,
            relation: link.relation
        }));
    } catch (error) {
        console.error('fetchChildren error:', error);
        return [];
    }
}

async function fetchNotices(schoolId, userId) {
    try {
        const notices = await prisma.notice.findMany({
            where: {
                schoolId,
                status: 'PUBLISHED',
                OR: [
                    { audience: 'ALL' },
                    { audience: 'PARENTS' },
                    {
                        NoticeTarget: {
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

async function fetchActiveAcademicYear(schoolId) {
    try {
        return await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true, name: true, startDate: true, endDate: true }
        });
    } catch (error) {
        console.error('fetchActiveAcademicYear error:', error);
        return null;
    }
}

async function fetchChildAttendance(schoolId, studentId, month, year) {
    try {
        // Fetch academic year to get overall stats (matches attendance detail page)
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { startDate: true, endDate: true }
        });

        const ayStart = academicYear?.startDate || new Date(year, 3, 1); // Default: April 1
        const ayEnd = academicYear?.endDate || new Date(year + 1, 2, 31); // Default: March 31
        const today = new Date();
        const effectiveEnd = today < ayEnd ? today : ayEnd;

        // Current month stats
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        const [overallRecords, monthlyRecords, overallWorkingDays, monthlyWorkingDays] = await Promise.all([
            // Overall academic year attendance
            prisma.attendance.findMany({
                where: {
                    schoolId,
                    userId: studentId,
                    date: { gte: ayStart, lte: effectiveEnd }
                },
                select: { status: true }
            }),
            // Current month attendance
            prisma.attendance.findMany({
                where: {
                    schoolId,
                    userId: studentId,
                    date: { gte: monthStart, lte: monthEnd }
                },
                select: { status: true }
            }),
            prisma.schoolCalendar.count({
                where: {
                    schoolId,
                    date: { gte: ayStart, lte: effectiveEnd },
                    dayType: 'WORKING_DAY'
                }
            }),
            prisma.schoolCalendar.count({
                where: {
                    schoolId,
                    date: { gte: monthStart, lte: monthEnd },
                    dayType: 'WORKING_DAY'
                }
            })
        ]);

        // Overall academic year stats (shown on dashboard card)
        const overallPresent = overallRecords.filter(a => a.status === 'PRESENT').length;
        const overallAbsent = overallRecords.filter(a => a.status === 'ABSENT').length;
        const overallTotal = overallWorkingDays || overallRecords.length;

        // Current month stats
        const monthPresent = monthlyRecords.filter(a => a.status === 'PRESENT').length;
        const monthAbsent = monthlyRecords.filter(a => a.status === 'ABSENT').length;
        const monthTotal = monthlyWorkingDays || monthlyRecords.length;

        return {
            monthlyStats: {
                // Use overall academic year percentage for the dashboard card
                attendancePercentage: overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0,
                totalPresent: overallPresent,
                totalAbsent: overallAbsent,
                totalWorkingDays: overallTotal,
                // Keep monthly stats separate for reference
                currentMonth: {
                    attendancePercentage: monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0,
                    totalPresent: monthPresent,
                    totalAbsent: monthAbsent,
                    totalWorkingDays: monthTotal
                }
            }
        };
    } catch (error) {
        console.error('fetchChildAttendance error:', error);
        return { monthlyStats: { attendancePercentage: 0 } };
    }
}

async function fetchChildHomework(schoolId, studentId) {
    try {
        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            select: { classId: true, sectionId: true }
        });

        if (!student) return { homework: [], counts: { pending: 0, total: 0 } };

        const homework = await prisma.homework.findMany({
            where: {
                schoolId,
                OR: [
                    { classId: student.classId, sectionId: student.sectionId },
                    { classId: student.classId, sectionId: null }
                ],
                dueDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            },
            orderBy: { dueDate: 'desc' },
            take: 20,
            include: {
                submissions: {
                    where: { studentId },
                    select: { status: true }
                },
                subject: { select: { subjectName: true } }
            }
        });

        const mapped = homework.map(hw => ({
            id: hw.id,
            title: hw.title,
            subject: hw.subject?.subjectName,
            dueDate: hw.dueDate,
            status: hw.submissions?.[0]?.status || 'PENDING',
            createdAt: hw.createdAt
        }));

        const pending = mapped.filter(h => h.status === 'PENDING').length;

        return {
            homework: mapped,
            counts: { pending, total: mapped.length }
        };
    } catch (error) {
        console.error('fetchChildHomework error:', error);
        return { homework: [], counts: { pending: 0, total: 0 } };
    }
}

async function fetchChildExams(schoolId, studentId) {
    try {
        const results = await prisma.examResult.findMany({
            where: {
                studentId,
                exam: { schoolId }
            },
            orderBy: { id: 'desc' },
            take: 10,
            include: {
                exam: {
                    select: { name: true, startDate: true }
                },
                subject: {
                    select: { subjectName: true }
                }
            }
        });

        // Get max marks from ExamSubject for percentage calculation
        const examSubjects = await prisma.examSubject.findMany({
            where: {
                examId: { in: [...new Set(results.map(r => r.examId))] }
            },
            select: { examId: true, subjectId: true, maxMarks: true }
        });

        // Create lookup map
        const maxMarksMap = {};
        examSubjects.forEach(es => {
            maxMarksMap[`${es.examId}_${es.subjectId}`] = es.maxMarks;
        });

        // Calculate percentage for each result
        const mappedResults = results.map(r => {
            const maxMarks = maxMarksMap[`${r.examId}_${r.subjectId}`] || 100;
            const percentage = r.marksObtained != null ? Math.round((r.marksObtained / maxMarks) * 100) : 0;
            const isPassed = percentage >= 33;
            return {
                id: r.id,
                examName: r.exam?.name,
                examDate: r.exam?.startDate,
                marksObtained: r.marksObtained,
                totalMarks: maxMarks,
                percentage,
                isPassed,
                subject: r.subject?.subjectName
            };
        });

        const totalExams = mappedResults.length;
        const totalPassed = mappedResults.filter(r => r.isPassed).length;
        const avgPercentage = totalExams > 0
            ? Math.round(mappedResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalExams)
            : 0;

        return {
            results: mappedResults,
            stats: { totalExams, totalPassed, avgPercentage }
        };
    } catch (error) {
        console.error('fetchChildExams error:', error);
        return { results: [], stats: { totalExams: 0, avgPercentage: 0 } };
    }
}

async function fetchChildFees(studentId, academicYearId) {
    try {
        if (!academicYearId) return null;

        const feeData = await prisma.studentFee.findFirst({
            where: { studentId, academicYearId },
            select: {
                originalAmount: true,
                paidAmount: true,
                balanceAmount: true,
                status: true
            }
        });

        return feeData;
    } catch (error) {
        console.error('fetchChildFees error:', error);
        return null;
    }
}
