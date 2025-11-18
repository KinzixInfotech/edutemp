// app/api/schools/[schoolId]/attendance/admin/reports/route.js

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export async function GET(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const reportType = searchParams.get('reportType') || 'MONTHLY';
    
    // Parse dates in IST timezone
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    const startDate = dayjs(startDateParam).tz('Asia/Kolkata').toDate();
    const endDate = dayjs(endDateParam).tz('Asia/Kolkata').toDate();
    
    const classId = searchParams.get('classId');
    const sectionId = searchParams.get('sectionId');
    const format = searchParams.get('format') || 'JSON';

    try {
        let reportData;

        switch (reportType) {
            case 'MONTHLY':
                reportData = await generateMonthlyReport(schoolId, startDate, endDate);
                break;

            case 'CLASS_WISE':
                reportData = await generateClassWiseReport(schoolId, startDate, endDate, classId);
                break;

            case 'STUDENT_WISE':
                reportData = await generateStudentWiseReport(schoolId, startDate, endDate, classId, sectionId);
                break;

            case 'TEACHER_PERFORMANCE':
                reportData = await generateTeacherReport(schoolId, startDate, endDate);
                break;

            case 'DEFAULTERS':
                console.log('Defaulters query params:', { 
                    schoolId, 
                    startDate, 
                    endDate,
                    startDateParam,
                    endDateParam
                });
                reportData = await generateDefaultersReport(schoolId, startDate, endDate);
                console.log('Defaulters found:', reportData.count);
                break;

            case 'LEAVE_ANALYSIS':
                reportData = await generateLeaveAnalysis(schoolId, startDate, endDate);
                break;

            case 'SUMMARY':
                reportData = await generateSummaryReport(schoolId, startDate, endDate);
                break;

            default:
                return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }

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
                    generatedBy: searchParams.get('userId') || 'admin'
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

// 3. Student-wise Report
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

    const studentStats = students.map(student => {
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

// 4. Teacher Performance Report
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

    const teacherDetails = await Promise.all(
        teachers.map(async (t) => {
            const user = await prisma.user.findUnique({
                where: { id: t.userId },
                select: {
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
            });

            const attendance = user.attendance;
            const present = attendance.filter(a => a.status === 'PRESENT').length;
            const late = attendance.filter(a => a.status === 'LATE').length;
            const avgLateMinutes = late > 0
                ? attendance.filter(a => a.isLateCheckIn).reduce((sum, a) => sum + (a.lateByMinutes || 0), 0) / late
                : 0;

            // Calculate streak
            const streak = await calculateStreak(t.userId, schoolId);

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
                streak,
                attendancePercentage: ((present + late) / t._count.id * 100).toFixed(2)
            };
        })
    );

    return {
        type: 'TEACHER_PERFORMANCE',
        period: { start: startDate, end: endDate },
        teachers: teacherDetails
    };
}

// 5. Defaulters Report - FIXED VERSION
async function generateDefaultersReport(schoolId, startDate, endDate) {
    const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true }
    });

    if (!academicYear) {
        throw new Error('No active academic year found');
    }

    // Parse dates in IST timezone
    const startDateIST = dayjs(startDate).tz('Asia/Kolkata');
    const endDateIST = dayjs(endDate).tz('Asia/Kolkata');
    
    const startMonth = startDateIST.month() + 1; // dayjs months are 0-indexed
    const startYear = startDateIST.year();
    const endMonth = endDateIST.month() + 1;
    const endYear = endDateIST.year();

    // Build the where clause to handle date ranges spanning multiple months
    const whereClause = {
        schoolId,
        academicYearId: academicYear.id,
        attendancePercentage: { lt: 75 }
    };

    // Handle date range filtering
    if (startMonth === endMonth && startYear === endYear) {
        // Same month and year
        whereClause.month = startMonth;
        whereClause.year = startYear;
    } else if (startYear === endYear) {
        // Same year, different months
        whereClause.year = startYear;
        whereClause.month = {
            gte: startMonth,
            lte: endMonth
        };
    } else {
        // Different years - use OR condition
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

    console.log('Defaulters where clause:', JSON.stringify(whereClause, null, 2));

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

    console.log(`Found ${defaulters.length} defaulters with attendance < 75%`);

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
            // Student details
            admissionNo: d.user.student?.admissionNo,
            rollNumber: d.user.student?.rollNumber,
            className: d.user.student?.class?.className,
            sectionName: d.user.student?.section?.name,
            contactNumber: d.user.student?.contactNumber,
            parentName: d.user.student?.FatherName || d.user.student?.MotherName,
            // Teacher details
            employeeId: d.user.teacher?.employeeId,
            designation: d.user.teacher?.designation,
            // Attendance stats
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
            startDate: { gte: startDate },
            endDate: { lte: endDate }
        },
        _count: { id: true },
        _sum: { totalDays: true }
    });

    const leavesByUser = await prisma.leaveRequest.findMany({
        where: {
            schoolId,
            startDate: { gte: startDate },
            endDate: { lte: endDate }
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

// Helper: Calculate streak
async function calculateStreak(userId, schoolId) {
    const records = await prisma.attendance.findMany({
        where: {
            userId,
            schoolId,
            status: { in: ['PRESENT', 'LATE'] }
        },
        orderBy: { date: 'desc' },
        take: 100,
        select: { date: true }
    });

    if (records.length === 0) return 0;

    let streak = 0;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);

    for (const record of records) {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);

        if (recordDate.getTime() === expectedDate.getTime()) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}