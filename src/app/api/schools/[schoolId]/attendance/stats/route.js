// app/api/schools/[schoolId]/attendance/stats/route.js
// Comprehensive attendance statistics and analytics with caching

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ISTDate } from '../bulk/route';
import { apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

// GET - Fetch attendance statistics
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get('userId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const classId = searchParams.get('classId');
    const fullYear = searchParams.get('fullYear') === 'true'; // New param for full academic year data

    try {
        // Get active academic year first (needed for cache key)
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true, startDate: true, endDate: true }
        });

        if (!academicYear) {
            return errorResponse('No active academic year', 404);
        }

        // For full year data (optimized for parent child attendance view)
        if (fullYear && userId) {
            const cacheKey = generateKey('attendance:fullYear', {
                schoolId,
                userId,
                academicYearId: academicYear.id
            });

            const result = await remember(cacheKey, async () => {
                // Fetch ALL attendance records for the academic year in one query
                const [allAttendance, allMonthlyStats, studentInfo] = await Promise.all([
                    prisma.attendance.findMany({
                        where: {
                            userId,
                            schoolId,
                            date: {
                                gte: academicYear.startDate,
                                lte: academicYear.endDate
                            }
                        },
                        orderBy: { date: 'desc' },
                        select: {
                            id: true,
                            date: true,
                            status: true,
                            checkInTime: true,
                            checkOutTime: true,
                            remarks: true
                        }
                    }),

                    // Get all monthly stats for the academic year
                    prisma.attendanceStats.findMany({
                        where: {
                            userId,
                            academicYearId: academicYear.id
                        },
                        orderBy: [{ year: 'asc' }, { month: 'asc' }]
                    }),

                    // Get student info (admission date for calculating from join)
                    prisma.student.findUnique({
                        where: { userId },
                        select: {
                            admissionDate: true,
                            rollNumber: true,
                            admissionNo: true
                        }
                    })
                ]);

                // Calculate overall stats (from academic year start or admission date)
                const effectiveStartDate = studentInfo?.admissionDate &&
                    new Date(studentInfo.admissionDate) > new Date(academicYear.startDate)
                    ? studentInfo.admissionDate
                    : academicYear.startDate;

                // Aggregate all monthly stats for overall calculation
                const overallStats = allMonthlyStats.reduce((acc, stat) => ({
                    totalWorkingDays: acc.totalWorkingDays + (stat.totalWorkingDays || 0),
                    totalPresent: acc.totalPresent + (stat.totalPresent || 0),
                    totalAbsent: acc.totalAbsent + (stat.totalAbsent || 0),
                    totalHalfDay: acc.totalHalfDay + (stat.totalHalfDay || 0),
                    totalLate: acc.totalLate + (stat.totalLate || 0),
                    totalLeaves: acc.totalLeaves + (stat.totalLeaves || 0),
                }), {
                    totalWorkingDays: 0,
                    totalPresent: 0,
                    totalAbsent: 0,
                    totalHalfDay: 0,
                    totalLate: 0,
                    totalLeaves: 0,
                });

                // Calculate overall attendance percentage
                overallStats.attendancePercentage = overallStats.totalWorkingDays > 0
                    ? ((overallStats.totalPresent + overallStats.totalLate + (overallStats.totalHalfDay * 0.5)) / overallStats.totalWorkingDays) * 100
                    : 0;

                // Calculate streak from all attendance
                const streak = calculateStreak(allAttendance);

                return {
                    userId,
                    academicYear: {
                        id: academicYear.id,
                        startDate: academicYear.startDate,
                        endDate: academicYear.endDate
                    },
                    studentInfo: {
                        admissionDate: studentInfo?.admissionDate,
                        rollNumber: studentInfo?.rollNumber,
                        admissionNo: studentInfo?.admissionNo,
                        effectiveStartDate
                    },
                    // Overall stats for the entire academic year
                    overallStats,
                    // All monthly stats for breakdown
                    monthlyStats: allMonthlyStats,
                    // All attendance records for calendar view (client will filter)
                    allAttendance,
                    streak,
                    totalRecords: allAttendance.length
                };
            }, 600); // 10 minutes cache for full year data

            return apiResponse(result);
        }

        // Original monthly stats logic (for backwards compatibility)
        const cacheKey = generateKey('attendance:stats', { schoolId, userId, month, year, classId });

        const result = await remember(cacheKey, async () => {
            // 1. USER-SPECIFIC STATS
            if (userId) {
                const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
                const currentYear = year ? parseInt(year) : new Date().getFullYear();

                const [monthlyStats, yearlyStats, recentAttendance] = await Promise.all([
                    // Monthly stats
                    prisma.attendanceStats.findUnique({
                        where: {
                            userId_academicYearId_month_year: {
                                userId,
                                academicYearId: academicYear.id,
                                month: currentMonth,
                                year: currentYear
                            }
                        }
                    }),

                    // Yearly stats
                    prisma.attendanceStats.findMany({
                        where: {
                            userId,
                            academicYearId: academicYear.id,
                            year: currentYear
                        },
                        orderBy: { month: 'asc' }
                    }),

                    // Recent attendance
                    prisma.attendance.findMany({
                        where: {
                            userId,
                            schoolId,
                            date: {
                                gte: ISTDate(new Date(currentYear, currentMonth - 1, 1)),
                                lte: ISTDate(new Date(currentYear, currentMonth, 0))
                            }
                        },
                        orderBy: { date: 'desc' }
                    })
                ]);

                // Calculate streaks
                const streak = calculateStreak(recentAttendance);

                // Get working days in month
                const workingDays = await prisma.schoolCalendar.count({
                    where: {
                        schoolId,
                        date: {
                            gte: ISTDate(new Date(currentYear, currentMonth - 1, 1)),
                            lte: ISTDate(new Date(currentYear, currentMonth, 0))
                        },
                        dayType: 'WORKING_DAY'
                    }
                });
                // Calculate real-time stats from recentAttendance
                const calculatedStats = recentAttendance.reduce((acc, record) => {
                    const status = record.status;
                    if (status === 'PRESENT') acc.totalPresent++;
                    else if (status === 'ABSENT') acc.totalAbsent++;
                    else if (status === 'LATE') acc.totalLate++;
                    else if (status === 'HALF_DAY') acc.totalHalfDay++;
                    else if (status === 'ON_LEAVE') acc.totalLeaves++;
                    return acc;
                }, { totalPresent: 0, totalAbsent: 0, totalLate: 0, totalHalfDay: 0, totalLeaves: 0, totalHolidays: 0 });

                // Use working days from calendar, or fallback to record count if calendar is missing/zero
                const effectiveWorkingDays = workingDays > 0 ? workingDays : recentAttendance.length;

                const percentage = effectiveWorkingDays > 0
                    ? ((calculatedStats.totalPresent + calculatedStats.totalLate + (calculatedStats.totalHalfDay * 0.5)) / effectiveWorkingDays) * 100
                    : 0;

                return {
                    userId,
                    monthlyStats: {
                        totalWorkingDays: effectiveWorkingDays,
                        totalPresent: calculatedStats.totalPresent,
                        totalAbsent: calculatedStats.totalAbsent,
                        totalHalfDay: calculatedStats.totalHalfDay,
                        totalLate: calculatedStats.totalLate,
                        totalLeaves: calculatedStats.totalLeaves,
                        attendancePercentage: percentage
                    },
                    yearlyStats,
                    yearlyAggregate: yearlyStats.reduce((acc, stat) => ({
                        totalPresent: acc.totalPresent + stat.totalPresent,
                        totalAbsent: acc.totalAbsent + stat.totalAbsent,
                        totalHalfDay: acc.totalHalfDay + stat.totalHalfDay,
                        totalLate: acc.totalLate + stat.totalLate,
                        totalLeaves: acc.totalLeaves + stat.totalLeaves,
                        totalWorkingDays: acc.totalWorkingDays + stat.totalWorkingDays
                    }), {
                        totalPresent: 0,
                        totalAbsent: 0,
                        totalHalfDay: 0,
                        totalLate: 0,
                        totalLeaves: 0,
                        totalWorkingDays: 0
                    }),
                    recentAttendance,
                    streak,
                    workingDaysInMonth: effectiveWorkingDays
                };
            }

            // 2. CLASS-SPECIFIC STATS
            if (classId) {
                const students = await prisma.student.findMany({
                    where: {
                        schoolId,
                        classId: parseInt(classId),
                        user: { deletedAt: null, status: 'ACTIVE' }
                    },
                    select: { userId: true }
                });

                const studentIds = students.map(s => s.userId);

                const classStats = await prisma.$queryRaw`
            SELECT 
              u.id as "userId",
              u.name,
              s."admissionNo",
              s."rollNumber",
              COALESCE(ast."attendancePercentage", 0) as "attendancePercentage",
              COALESCE(ast."totalPresent", 0) as "totalPresent",
              COALESCE(ast."totalAbsent", 0) as "totalAbsent",
              COALESCE(ast."totalLate", 0) as "totalLate",
              COALESCE(ast."totalWorkingDays", 0) as "totalWorkingDays"
            FROM "User" u
            INNER JOIN "Student" s ON s."userId" = u.id
            LEFT JOIN "AttendanceStats" ast ON ast."userId" = u.id 
              AND ast."academicYearId" = ${academicYear.id}::uuid
              AND ast.month = ${parseInt(month || new Date().getMonth() + 1)}
              AND ast.year = ${parseInt(year || new Date().getFullYear())}
            WHERE u.id = ANY(${studentIds}::uuid[])
            ORDER BY s."rollNumber", u.name
          `;

                return {
                    classId: parseInt(classId),
                    students: classStats.map(stat => ({
                        ...stat,
                        attendancePercentage: Number(stat.attendancePercentage),
                        totalPresent: Number(stat.totalPresent),
                        totalAbsent: Number(stat.totalAbsent),
                        totalLate: Number(stat.totalLate),
                        totalWorkingDays: Number(stat.totalWorkingDays)
                    }))
                };
            }

            // 3. SCHOOL-WIDE COMPARISON
            const comparison = await prisma.$queryRaw`
          SELECT 
            r.name as "roleName",
            AVG(ast."attendancePercentage") as "avgAttendance",
            COUNT(DISTINCT ast."userId") as "totalUsers",
            SUM(ast."totalPresent") as "totalPresent",
            SUM(ast."totalAbsent") as "totalAbsent"
          FROM "AttendanceStats" ast
          INNER JOIN "User" u ON u.id = ast."userId"
          INNER JOIN "Role" r ON r.id = u."roleId"
          WHERE ast."schoolId" = ${schoolId}::uuid
            AND ast."academicYearId" = ${academicYear.id}::uuid
            AND ast.month = ${parseInt(month || new Date().getMonth() + 1)}
            AND ast.year = ${parseInt(year || new Date().getFullYear())}
          GROUP BY r.name
          ORDER BY "avgAttendance" DESC
        `;

            return {
                comparison: comparison.map(c => ({
                    ...c,
                    avgAttendance: Number(c.avgAttendance).toFixed(2),
                    totalUsers: Number(c.totalUsers),
                    totalPresent: Number(c.totalPresent),
                    totalAbsent: Number(c.totalAbsent)
                }))
            };
        }, 300); // 5 minutes cache

        return apiResponse(result);

    } catch (error) {
        console.error('Stats error:', error);
        return errorResponse(error.message || 'Failed to fetch statistics', 500);
    }
}

// POST - Force recalculate stats
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { userId, month, year } = body;

    try {
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true }
        });

        if (!academicYear) {
            return NextResponse.json({ error: 'No active academic year' }, { status: 404 });
        }

        const targetMonth = month || new Date().getMonth() + 1;
        const targetYear = year || new Date().getFullYear();

        await recalculateStats(schoolId, academicYear.id, userId, targetMonth, targetYear);

        return NextResponse.json({
            success: true,
            message: 'Statistics recalculated successfully'
        });

    } catch (error) {
        console.error('Recalculate error:', error);
        return NextResponse.json({
            error: 'Failed to recalculate statistics'
        }, { status: 500 });
    }
}

// Helper functions
function calculateStreak(attendanceRecords) {
    if (!attendanceRecords || attendanceRecords.length === 0) {
        return { current: 0, longest: 0 };
    }

    const sortedRecords = attendanceRecords
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedRecords.length; i++) {
        if (sortedRecords[i].status === 'PRESENT' || sortedRecords[i].status === 'LATE') {
            tempStreak++;
            if (i === 0) currentStreak = tempStreak;
            longestStreak = Math.max(longestStreak, tempStreak);
        } else if (sortedRecords[i].status === 'ABSENT') {
            if (i === 0) currentStreak = 0;
            tempStreak = 0;
        }
    }

    return { current: currentStreak, longest: longestStreak };
}

async function recalculateStats(schoolId, academicYearId, userId, month, year) {
    const users = userId
        ? [{ userId }]
        : await prisma.attendance.groupBy({
            by: ['userId'],
            where: {
                schoolId,
                date: {
                    gte: ISTDate(new Date(year, month - 1, 1)),
                    lte: ISTDate(new Date(year, month, 0))
                }
            }
        });

    for (const user of users) {
        const stats = await prisma.attendance.groupBy({
            by: ['status'],
            where: {
                userId: user.userId,
                schoolId,
                date: {
                    gte: ISTDate(new Date(year, month - 1, 1)),
                    lte: ISTDate(new Date(year, month, 0))
                }
            },
            _count: { id: true },
            _avg: { workingHours: true }
        });

        const workingDays = await prisma.schoolCalendar.count({
            where: {
                schoolId,
                date: {
                    gte: ISTDate(new Date(year, month - 1, 1)),
                    lte: ISTDate(new Date(year, month, 0))
                },
                dayType: 'WORKING_DAY'
            }
        });

        const totalPresent = stats.find(s => s.status === 'PRESENT')?._count.id || 0;
        const totalAbsent = stats.find(s => s.status === 'ABSENT')?._count.id || 0;
        const totalHalfDay = stats.find(s => s.status === 'HALF_DAY')?._count.id || 0;
        const totalLate = stats.find(s => s.status === 'LATE')?._count.id || 0;
        const totalLeaves = stats.find(s => s.status === 'ON_LEAVE')?._count.id || 0;
        const totalHolidays = stats.find(s => s.status === 'HOLIDAY')?._count.id || 0;

        const totalDays = totalPresent + totalAbsent + totalHalfDay + totalLate + totalLeaves;
        const attendancePercentage = workingDays > 0
            ? ((totalPresent + totalLate + (totalHalfDay * 0.5)) / workingDays) * 100
            : 0;

        const avgWorkingHours = stats.reduce((acc, s) => acc + (s._avg.workingHours || 0), 0) / (stats.length || 1);

        await prisma.attendanceStats.upsert({
            where: {
                userId_academicYearId_month_year: {
                    userId: user.userId,
                    academicYearId,
                    month,
                    year
                }
            },
            update: {
                totalWorkingDays: workingDays,
                totalPresent,
                totalAbsent,
                totalHalfDay,
                totalLate,
                totalLeaves,
                totalHolidays,
                attendancePercentage,
                avgWorkingHours,
                lastCalculated: new Date(),
            },
            create: {
                userId: user.userId,
                schoolId,
                academicYearId,
                month,
                year,
                totalWorkingDays: workingDays,
                totalPresent,
                totalAbsent,
                totalHalfDay,
                totalLate,
                totalLeaves,
                totalHolidays,
                attendancePercentage,
                avgWorkingHours,
            }
        });
    }
}