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

        // Fetch the active academic year for this school
        const activeYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true, name: true, startDate: true, endDate: true }
        });

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
            // 2. Attendance Stats (full academic year)
            fetchAttendanceStats(schoolId, userId, activeYear),
            // 3. Exam Results (scoped to academic year)
            fetchExamResults(schoolId, userId, activeYear),
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
                student: studentData,
                academicYear: activeYear ? { name: activeYear.name, startDate: activeYear.startDate, endDate: activeYear.endDate } : null
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
                    { audience: 'ALL' },
                    { audience: 'STUDENTS' },
                    {
                        NoticeTarget: {
                            some: { userId }
                        }
                    }
                ]
            },
            orderBy: { id: 'desc' },
            take: 4,
            select: {
                id: true,
                title: true,
                createdAt: true,
                NoticeReads: {
                    where: { userId },
                    select: { id: true }
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

async function fetchAttendanceStats(schoolId, userId, activeYear) {
    try {
        // Use the full academic year date range (not just current month)
        const now = new Date();
        const startDate = activeYear?.startDate ? new Date(activeYear.startDate) : new Date(now.getFullYear(), 3, 1); // Fallback: April 1
        const endDate = activeYear?.endDate ? new Date(activeYear.endDate) : now; // Fallback: today
        // Don't count future days - cap at today
        const effectiveEndDate = endDate > now ? now : endDate;

        const [attendanceRecords, workingDays] = await Promise.all([
            prisma.attendance.findMany({
                where: {
                    schoolId,
                    userId,
                    date: { gte: startDate, lte: effectiveEndDate }
                },
                select: { status: true }
            }),
            prisma.schoolCalendar.count({
                where: {
                    schoolId,
                    date: { gte: startDate, lte: effectiveEndDate },
                    dayType: 'WORKING_DAY'
                }
            })
        ]);

        const present = attendanceRecords.filter(a => a.status === 'PRESENT').length;
        const absent = attendanceRecords.filter(a => a.status === 'ABSENT').length;
        const late = attendanceRecords.filter(a => a.status === 'LATE').length;
        const total = workingDays || attendanceRecords.length;

        return {
            monthlyStats: {
                attendancePercentage: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
                totalPresent: present + late,
                totalAbsent: absent,
                totalWorkingDays: total,
                totalLate: late
            }
        };
    } catch (error) {
        console.error('fetchAttendanceStats error:', error);
        return { monthlyStats: { attendancePercentage: 0, totalPresent: 0, totalAbsent: 0, totalWorkingDays: 0, totalLate: 0 } };
    }
}

async function fetchExamResults(schoolId, userId, activeYear) {
    try {
        const results = await prisma.examResult.findMany({
            where: {
                studentId: userId,
                exam: {
                    schoolId,
                    ...(activeYear?.id ? { academicYearId: activeYear.id } : {})
                }
            },
            orderBy: { id: 'desc' },
            take: 10,
            include: {
                exam: {
                    select: { title: true, startDate: true }
                },
                subject: {
                    select: { subjectName: true }
                }
            }
        });

        if (results.length === 0) return { results: [], stats: { totalExams: 0, totalPassed: 0, avgPercentage: 0 } };

        // Fetch maxMarks from ExamSubject for these results
        const examIds = Array.from(new Set(results.map(r => r.examId)));
        const subjectIds = Array.from(new Set(results.map(r => r.subjectId)));

        const examSubjects = await prisma.examSubject.findMany({
            where: {
                examId: { in: examIds },
                subjectId: { in: subjectIds }
            },
            select: { examId: true, subjectId: true, maxMarks: true, passingMarks: true }
        });

        const esMap = new Map();
        examSubjects.forEach(es => esMap.set(`${es.examId}-${es.subjectId}`, es));

        const processedResults = results.map(r => {
            const es = esMap.get(`${r.examId}-${r.subjectId}`);
            const maxMarks = es?.maxMarks || 100;
            const passingMarks = es?.passingMarks || 33;
            const percentage = Math.round(((r.marksObtained || 0) / maxMarks) * 100);

            return {
                id: r.id,
                examName: r.exam?.title,
                subjectName: r.subject?.subjectName,
                examDate: r.exam?.startDate,
                marksObtained: r.marksObtained,
                totalMarks: maxMarks,
                percentage: percentage,
                isPassed: r.marksObtained >= passingMarks,
                createdAt: r.id
            };
        });

        const totalExams = processedResults.length;
        const totalPassed = processedResults.filter(r => r.isPassed).length;
        const avgPercentage = Math.round(processedResults.reduce((sum, r) => sum + r.percentage, 0) / totalExams);

        return {
            results: processedResults,
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
                subject: { select: { subjectName: true } }
            }
        });

        return homework.map(hw => ({
            id: hw.id,
            title: hw.title,
            subject: hw.subject?.subjectName,
            dueDate: hw.dueDate,
            status: hw.submissions?.[0]?.status || 'PENDING',
            createdAt: hw.id // Fallback
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
                name: true,
                admissionNo: true,
                class: { select: { id: true, className: true } },
                section: { select: { id: true, name: true } }
            }
        });
        if (student) student.id = userId; // Add id manually for component consistency
        return student;
    } catch (error) {
        console.error('fetchStudentInfo error:', error);
        return null;
    }
}

