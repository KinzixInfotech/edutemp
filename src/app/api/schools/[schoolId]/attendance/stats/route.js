// app/api/schools/[schoolId]/attendance/stats/route.js
// Comprehensive attendance statistics and analytics

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const classId = searchParams.get('classId');

    try {
        const cacheKey = generateKey('attendance:stats', { schoolId, userId, month, year, classId });

        const result = await remember(cacheKey, async () => {
            // Get active academic year
            const academicYear = await prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true, startDate: true, endDate: true }
            });

            if (!academicYear) {
                throw new Error('No active academic year');
            }

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
                return {
                    userId,
                    monthlyStats: monthlyStats || {
                        totalWorkingDays: workingDays,
                        totalPresent: 0,
                        totalAbsent: 0,
                        totalHalfDay: 0,
                        totalLate: 0,
                        totalLeaves: 0,
                        attendancePercentage: 0
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
                    workingDaysInMonth: workingDays
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

        // Stats is an object, not an array, so return as-is
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