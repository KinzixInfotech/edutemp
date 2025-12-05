// app/api/schools/[schoolId]/attendance/admin/reports/route.js

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey } from "@/lib/cache";

// SIMPLE: Use the same ISTDate function from bulk attendance
export const ISTDate = (input) => {
    if (!input) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }

    // If input is YYYY-MM-DD, just append time
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return new Date(`${input}T00:00:00.000Z`);
    }

    // Otherwise parse normally
    const d = new Date(input);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const reportType = searchParams.get('reportType') || 'MONTHLY';

    // Parse dates using ISTDate
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = ISTDate(startDateParam);
    const endDate = ISTDate(endDateParam);

    const classId = searchParams.get('classId');
    const sectionId = searchParams.get('sectionId');
    const format = searchParams.get('format') || 'JSON';
    const userId = searchParams.get('userId'); // For metadata

    try {
        const cacheKey = generateKey('attendance:reports', {
            schoolId, reportType, startDate: startDate.toISOString(), endDate: endDate.toISOString(), classId, sectionId
        });

        const reportData = await remember(cacheKey, async () => {
            switch (reportType) {
                case 'MONTHLY':
                    return await generateMonthlyReport(schoolId, startDate, endDate);

                case 'CLASS_WISE':
                    return await generateClassWiseReport(schoolId, startDate, endDate, classId);

                case 'STUDENT_WISE':
                    return await generateStudentWiseReport(schoolId, startDate, endDate, classId, sectionId);

                case 'TEACHER_PERFORMANCE':
                    return await generateTeacherReport(schoolId, startDate, endDate);

                case 'DEFAULTERS':
                    return await generateDefaultersReport(schoolId, startDate, endDate);

                case 'LEAVE_ANALYSIS':
                    return await generateLeaveAnalysis(schoolId, startDate, endDate);

                case 'SUMMARY':
                    return await generateSummaryReport(schoolId, startDate, endDate);

                default:
                    throw new Error('Invalid report type');
            }
        }, 300); // Cache for 5 minutes

        if (format === 'PDF' || format === 'EXCEL') {
            return NextResponse.json({
                success: true,
                format,
                reportType,
                data: reportData,
                metadata: {
                    generatedAt: new Date(),
                    schoolId,
                    period: { startDate, endDate },
                    generatedBy: userId || 'admin'
                }
            });
        }

        return NextResponse.json(reportData);

    } catch (error) {
        console.error('Report generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate report',
            details: error.message
        }, { status: 500 });
    }
}

// 1. Monthly Report
async function generateMonthlyReport(schoolId, startDate, endDate) {
    const dailyStats = await prisma.$queryRaw`
    SELECT 
      DATE(a.date) as date,
      COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
      COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
      COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late,
      COUNT(CASE WHEN a.status = 'HALF_DAY' THEN 1 END) as "halfDay",
      COUNT(CASE WHEN a.status = 'ON_LEAVE' THEN 1 END) as "onLeave",
      COUNT(*) as total
    FROM "Attendance" a
    WHERE a."schoolId" = ${schoolId}::uuid
      AND a.date >= ${startDate}::date
      AND a.date <= ${endDate}::date
    GROUP BY DATE(a.date)
    ORDER BY date ASC
  `;

    const summary = {
        totalDays: dailyStats.length,
        totalPresent: dailyStats.reduce((sum, d) => sum + Number(d.present), 0),
        totalAbsent: dailyStats.reduce((sum, d) => sum + Number(d.absent), 0),
        totalLate: dailyStats.reduce((sum, d) => sum + Number(d.late), 0),
        totalLeaves: dailyStats.reduce((sum, d) => sum + Number(d.onLeave), 0),
        avgAttendancePercentage: 0
    };

    const total = summary.totalPresent + summary.totalAbsent + summary.totalLate + summary.totalLeaves;
    summary.avgAttendancePercentage = total > 0
        ? ((summary.totalPresent + summary.totalLate) / total * 100).toFixed(2)
        : 0;

    return {
        type: 'MONTHLY',
        period: { start: startDate, end: endDate },
        dailyStats: dailyStats.map(d => ({
            date: d.date,
            present: Number(d.present),
            absent: Number(d.absent),
            late: Number(d.late),
            halfDay: Number(d.halfDay),
            onLeave: Number(d.onLeave),
            total: Number(d.total)
        })),
        summary
    };
}

// 2. Class-wise Report
async function generateClassWiseReport(schoolId, startDate, endDate, classId) {
    let classStats;

    if (classId) {
        // With class filter
        classStats = await prisma.$queryRaw`
      SELECT 
        c.id as "classId",
        c."className",
        COUNT(DISTINCT s."userId") as "totalStudents",
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'HALF_DAY' THEN 1 END) as "halfDay",
        COUNT(CASE WHEN a.status = 'ON_LEAVE' THEN 1 END) as "onLeave",
        ROUND(
          (COUNT(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 END)::numeric / 
          NULLIF(COUNT(a.id), 0) * 100), 2
        ) as "attendancePercentage"
      FROM "Class" c
      LEFT JOIN "Student" s ON s."classId" = c.id AND s."schoolId" = ${schoolId}::uuid
      LEFT JOIN "Attendance" a ON a."userId" = s."userId" 
        AND a.date >= ${startDate}::date 
        AND a.date <= ${endDate}::date
      WHERE c."schoolId" = ${schoolId}::uuid
        AND c.id = ${parseInt(classId)}
      GROUP BY c.id, c."className"
      ORDER BY c."className"
    `;
    } else {
        // Without class filter
        classStats = await prisma.$queryRaw`
      SELECT 
        c.id as "classId",
        c."className",
        COUNT(DISTINCT s."userId") as "totalStudents",
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'HALF_DAY' THEN 1 END) as "halfDay",
        COUNT(CASE WHEN a.status = 'ON_LEAVE' THEN 1 END) as "onLeave",
        ROUND(
          (COUNT(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 END)::numeric / 
          NULLIF(COUNT(a.id), 0) * 100), 2
        ) as "attendancePercentage"
      FROM "Class" c
      LEFT JOIN "Student" s ON s."classId" = c.id AND s."schoolId" = ${schoolId}::uuid
      LEFT JOIN "Attendance" a ON a."userId" = s."userId" 
        AND a.date >= ${startDate}::date 
        AND a.date <= ${endDate}::date
      WHERE c."schoolId" = ${schoolId}::uuid
      GROUP BY c.id, c."className"
      ORDER BY c."className"
    `;
    }

    return {
        type: 'CLASS_WISE',
        period: { start: startDate, end: endDate },
        classes: classStats.map(c => ({
            classId: c.classId,
            className: c.className,
            totalStudents: Number(c.totalStudents),
            present: Number(c.present),
            absent: Number(c.absent),
            late: Number(c.late),
            halfDay: Number(c.halfDay),
            onLeave: Number(c.onLeave),
            attendancePercentage: Number(c.attendancePercentage || 0)
        }))
    };
}

// 3. Student-wise Report - OPTIMIZED
async function generateStudentWiseReport(schoolId, startDate, endDate, classId, sectionId) {
    const where = {
        schoolId,
        ...(classId && { classId: parseInt(classId) }),
        ...(sectionId && { sectionId: parseInt(sectionId) }),
        user: { deletedAt: null, status: 'ACTIVE' }
    };

    const students = await prisma.student.findMany({
        where,
        select: {
            userId: true,
            name: true,
            admissionNo: true,
            rollNumber: true,
            class: { select: { className: true } },
            section: { select: { name: true } },
            user: {
                select: {
                    attendance: {
                        where: {
                            date: { gte: startDate, lte: endDate }
                        },
                        select: {
                            date: true,
                            status: true,
                            checkInTime: true,
                            checkOutTime: true,
                            workingHours: true
                        }
                    }
                }
            }
        },
        orderBy: [
            { class: { className: 'asc' } },
            { rollNumber: 'asc' }
        ]
    });

    // Batch fetch streaks
    const studentIds = students.map(s => s.userId);
    const streaks = await batchCalculateStreak(studentIds, schoolId);

    const studentStats = students.map((student) => {
        const attendance = student.user.attendance;
        const present = attendance.filter(a => a.status === 'PRESENT').length;
        const absent = attendance.filter(a => a.status === 'ABSENT').length;
        const late = attendance.filter(a => a.status === 'LATE').length;
        const leaves = attendance.filter(a => a.status === 'ON_LEAVE').length;
        const total = attendance.length;
        const percentage = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

        return {
            userId: student.userId,
            name: student.name,
            admissionNo: student.admissionNo,
            rollNumber: student.rollNumber,
            className: student.class.className,
            streak: streaks[student.userId] || 0,
            sectionName: student.section?.name,
            attendance: {
                total,
                present,
                absent,
                late,
                leaves,
                percentage: Number(percentage)
            },
            records: attendance
        };
    });

    return {
        type: 'STUDENT_WISE',
        period: { start: startDate, end: endDate },
        students: studentStats
    };
}

// 4. Teacher Performance Report - OPTIMIZED
async function generateTeacherReport(schoolId, startDate, endDate) {
    const teachers = await prisma.attendance.groupBy({
        by: ['userId'],
        where: {
            schoolId,
            date: { gte: startDate, lte: endDate },
            user: { role: { name: 'TEACHING_STAFF' } }
        },
        _count: { id: true },
        _sum: { workingHours: true },
        _avg: { workingHours: true }
    });

    const teacherIds = teachers.map(t => t.userId);

    // Batch fetch user details and streaks
    const [users, streaks] = await Promise.all([
        prisma.user.findMany({
            where: { id: { in: teacherIds } },
            select: {
                id: true,
                name: true,
                email: true,
                teacher: {
                    select: {
                        employeeId: true,
                        designation: true,
                        department: { select: { name: true } }
                    }
                },
                attendance: {
                    where: {
                        date: { gte: startDate, lte: endDate }
                    },
                    select: {
                        status: true,
                        isLateCheckIn: true,
                        lateByMinutes: true
                    }
                }
            }
        }),
        batchCalculateStreak(teacherIds, schoolId)
    ]);

    const userMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

    const teacherDetails = teachers.map((t) => {
        const user = userMap[t.userId];
        if (!user) return null;

        const attendance = user.attendance;
        const present = attendance.filter(a => a.status === 'PRESENT').length;
        const late = attendance.filter(a => a.status === 'LATE').length;
        const avgLateMinutes = late > 0
            ? attendance.filter(a => a.isLateCheckIn).reduce((sum, a) => sum + (a.lateByMinutes || 0), 0) / late
            : 0;

        return {
            userId: t.userId,
            name: user.name,
            employeeId: user.teacher?.employeeId,
            designation: user.teacher?.designation,
            department: user.teacher?.department?.name,
            totalDays: t._count.id,
            presentDays: present,
            lateDays: late,
            totalHours: t._sum.workingHours || 0,
            avgHours: t._avg.workingHours || 0,
            avgLateMinutes: avgLateMinutes.toFixed(2),
            streak: streaks[t.userId] || 0,
            attendancePercentage: ((present + late) / t._count.id * 100).toFixed(2)
        };
    }).filter(Boolean);

    return {
        type: 'TEACHER_PERFORMANCE',
        period: { start: startDate, end: endDate },
        teachers: teacherDetails
    };
}

// 5. Defaulters Report
async function generateDefaultersReport(schoolId, startDate, endDate) {
    const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true }
    });

    if (!academicYear) {
        throw new Error('No active academic year found');
    }

    const startMonth = startDate.getMonth() + 1;
    const startYear = startDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    const endYear = endDate.getFullYear();

    const whereClause = {
        schoolId,
        academicYearId: academicYear.id,
        attendancePercentage: { lt: 75 }
    };

    if (startMonth === endMonth && startYear === endYear) {
        whereClause.month = startMonth;
        whereClause.year = startYear;
    } else if (startYear === endYear) {
        whereClause.year = startYear;
        whereClause.month = {
            gte: startMonth,
            lte: endMonth
        };
    } else {
        whereClause.OR = [
            {
                year: startYear,
                month: { gte: startMonth }
            },
            {
                year: endYear,
                month: { lte: endMonth }
            },
            {
                year: { gt: startYear, lt: endYear }
            }
        ];
        delete whereClause.month;
        delete whereClause.year;
    }

    const defaulters = await prisma.attendanceStats.findMany({
        where: whereClause,
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    student: {
                        select: {
                            admissionNo: true,
                            rollNumber: true,
                            class: { select: { className: true } },
                            section: { select: { name: true } },
                            contactNumber: true,
                            FatherName: true,
                            MotherName: true
                        }
                    },
                    teacher: {
                        select: {
                            employeeId: true,
                            designation: true
                        }
                    }
                }
            }
        },
        orderBy: { attendancePercentage: 'asc' }
    });

    return {
        type: 'DEFAULTERS',
        threshold: 75,
        period: { start: startDate, end: endDate },
        count: defaulters.length,
        defaulters: defaulters.map(d => ({
            userId: d.userId,
            name: d.user.name,
            email: d.user.email,
            userType: d.user.student ? 'Student' : 'Teacher',
            admissionNo: d.user.student?.admissionNo,
            rollNumber: d.user.student?.rollNumber,
            className: d.user.student?.class?.className,
            sectionName: d.user.student?.section?.name,
            contactNumber: d.user.student?.contactNumber,
            parentName: d.user.student?.FatherName || d.user.student?.MotherName,
            employeeId: d.user.teacher?.employeeId,
            designation: d.user.teacher?.designation,
            attendancePercentage: Number(d.attendancePercentage).toFixed(2),
            totalPresent: d.totalPresent,
            totalAbsent: d.totalAbsent,
            totalLate: d.totalLate,
            month: d.month,
            year: d.year
        }))
    };
}

// 6. Leave Analysis Report
async function generateLeaveAnalysis(schoolId, startDate, endDate) {
    const leaveStats = await prisma.leaveRequest.groupBy({
        by: ['leaveType', 'status'],
        where: {
            schoolId,
            AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } }
            ]
        },
        _count: { id: true },
        _sum: { totalDays: true }
    });

    const leavesByUser = await prisma.leaveRequest.findMany({
        where: {
            schoolId,
            AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } }
            ]
        },
        include: {
            user: {
                select: {
                    name: true,
                    role: { select: { name: true } }
                }
            }
        }
    });

    const summary = leaveStats.reduce((acc, stat) => {
        if (!acc[stat.leaveType]) {
            acc[stat.leaveType] = { total: 0, approved: 0, rejected: 0, pending: 0, days: 0 };
        }
        acc[stat.leaveType][stat.status.toLowerCase()] = stat._count.id;
        acc[stat.leaveType].days += stat._sum.totalDays || 0;
        return acc;
    }, {});

    return {
        type: 'LEAVE_ANALYSIS',
        period: { start: startDate, end: endDate },
        summary,
        totalRequests: leavesByUser.length,
        totalDays: leavesByUser.reduce((sum, l) => sum + l.totalDays, 0),
        requests: leavesByUser.map(l => ({
            userName: l.user.name,
            userRole: l.user.role.name,
            leaveType: l.leaveType,
            startDate: l.startDate,
            endDate: l.endDate,
            totalDays: l.totalDays,
            status: l.status,
            reason: l.reason
        }))
    };
}

// 7. Summary Report
async function generateSummaryReport(schoolId, startDate, endDate) {
    const [monthlyData, classData, teacherData, leaveData] = await Promise.all([
        generateMonthlyReport(schoolId, startDate, endDate),
        generateClassWiseReport(schoolId, startDate, endDate, null),
        generateTeacherReport(schoolId, startDate, endDate),
        generateLeaveAnalysis(schoolId, startDate, endDate)
    ]);

    return {
        type: 'SUMMARY',
        period: { start: startDate, end: endDate },
        overview: monthlyData.summary,
        classSummary: {
            totalClasses: classData.classes.length,
            avgAttendance: classData.classes.length > 0
                ? (classData.classes.reduce((sum, c) => sum + c.attendancePercentage, 0) / classData.classes.length).toFixed(2)
                : 0
        },
        teacherSummary: {
            totalTeachers: teacherData.teachers.length,
            avgWorkingHours: teacherData.teachers.length > 0
                ? (teacherData.teachers.reduce((sum, t) => sum + t.avgHours, 0) / teacherData.teachers.length).toFixed(2)
                : 0
        },
        leaveSummary: leaveData.summary
    };
}

// Helper: Calculate streak - BATCHED
async function batchCalculateStreak(userIds, schoolId) {
    if (!userIds.length) return {};

    // Fetch last 100 records for ALL users in the list
    // We can't easily do "Limit 100 per user" in one query without window functions or raw SQL.
    // For now, let's fetch records for the last 30 days for these users, which should cover most streaks.
    // Or just fetch all records for these users if the dataset isn't huge.
    // A better approach for "streak" is to fetch records where date is recent.

    // Let's use a raw query to get the last 30 records for each user
    // Or just fetch records for the last 60 days.
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    const records = await prisma.attendance.findMany({
        where: {
            userId: { in: userIds },
            schoolId,
            status: { in: ['PRESENT', 'LATE'] },
            date: { gte: twoMonthsAgo }
        },
        select: { userId: true, date: true },
        orderBy: { date: 'desc' }
    });

    const recordsByUser = records.reduce((acc, r) => {
        if (!acc[r.userId]) acc[r.userId] = [];
        acc[r.userId].push(r);
        return acc;
    }, {});

    const streaks = {};
    const expectedDate = ISTDate(); // Today midnight

    for (const userId of userIds) {
        const userRecords = recordsByUser[userId] || [];
        let streak = 0;
        let currentExpected = new Date(expectedDate);

        for (const record of userRecords) {
            const recordDate = ISTDate(record.date);

            // If record matches expected date
            if (recordDate.getTime() === currentExpected.getTime()) {
                streak++;
                currentExpected.setDate(currentExpected.getDate() - 1);
            } else if (recordDate.getTime() > currentExpected.getTime()) {
                // Future record? Should not happen with desc sort and today start
                continue;
            } else {
                // Gap found
                // Check if the gap is a holiday? 
                // For simplicity, we break on gap.
                // To be accurate we need to check calendar for holidays.
                // Assuming streak breaks on non-attendance.
                break;
            }
        }
        streaks[userId] = streak;
    }

    return streaks;
}

// Legacy single streak calculation (kept for backward compatibility if needed)
export async function calculateStreak(userId, schoolId) {
    const streaks = await batchCalculateStreak([userId], schoolId);
    return streaks[userId] || 0;
}