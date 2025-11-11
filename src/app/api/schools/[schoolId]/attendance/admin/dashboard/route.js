// app/api/schools/[schoolId]/attendance/admin/dashboard/route.js
// Admin Dashboard - Comprehensive attendance overview with stats and filters

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const { schoolId } = params;
  const { searchParams } = new URL(req.url);

  const date = searchParams.get('date') ? new Date(searchParams.get('date')) : new Date();
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : null;
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : null;
  const roleId = searchParams.get('roleId');
  const classId = searchParams.get('classId');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
    console.log(schoolId);

  try {
    // ✅ Check if schoolId exists
    if (!schoolId) {
      return NextResponse.json(
        { message: 'Missing schoolId in request parameters' },
        { status: 400 }
      );
    }
    
    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, startDate: true, endDate: true }
    });

    if (!academicYear) {
      return NextResponse.json({ error: 'No active academic year' }, { status: 404 });
    }

    // Build filter conditions
    const attendanceWhere = {
      schoolId,
      ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : { date }),
      ...(status && { status }),
    };

    const userWhere = {
      schoolId,
      deletedAt: null,
      ...(roleId && { roleId: parseInt(roleId) }),
    };

    // 1. TODAY'S OVERVIEW
    const todayStats = await prisma.attendance.groupBy({
      by: ['status'],
      where: { schoolId, date: new Date(date.toDateString()) },
      _count: { id: true },
    });

    const todayOverview = {
      date: date.toISOString(),
      total: todayStats.reduce((sum, s) => sum + s._count.id, 0),
      present: todayStats.find(s => s.status === 'PRESENT')?._count.id || 0,
      absent: todayStats.find(s => s.status === 'ABSENT')?._count.id || 0,
      late: todayStats.find(s => s.status === 'LATE')?._count.id || 0,
      halfDay: todayStats.find(s => s.status === 'HALF_DAY')?._count.id || 0,
      onLeave: todayStats.find(s => s.status === 'ON_LEAVE')?._count.id || 0,
    };

    todayOverview.notMarked = await prisma.user.count({
      where: {
        ...userWhere,
        attendance: {
          none: { date: new Date(date.toDateString()) }
        }
      }
    });

    // 2. ROLE-WISE BREAKDOWN
    const roleWiseStats = await prisma.$queryRaw`
      SELECT 
        r.name as "roleName",
        r.id as "roleId",
        COUNT(DISTINCT u.id) as "totalUsers",
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'HALF_DAY' THEN 1 END) as "halfDay",
        COUNT(CASE WHEN a.status = 'ON_LEAVE' THEN 1 END) as "onLeave"
      FROM "Role" r
      LEFT JOIN "User" u ON u."roleId" = r.id AND u."schoolId" = ${schoolId}::uuid AND u."deletedAt" IS NULL
      LEFT JOIN "Attendance" a ON a."userId" = u.id AND a.date = ${date.toISOString().split('T')[0]}::date
      WHERE r.name IN ('Student', 'TeachingStaff', 'NonTeachingStaff', 'Admin')
      GROUP BY r.id, r.name
      ORDER BY r.name
    `;

    // 3. CLASS-WISE STATS (for students)
    const classWiseStats = await prisma.$queryRaw`
      SELECT 
        c.id as "classId",
        c."className",
        COUNT(DISTINCT s."userId") as "totalStudents",
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late,
        ROUND(
          (COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END)::numeric / 
          NULLIF(COUNT(DISTINCT s."userId"), 0) * 100), 2
        ) as "attendancePercentage"
      FROM "Class" c
      LEFT JOIN "Student" s ON s."classId" = c.id AND s."schoolId" = ${schoolId}::uuid
      LEFT JOIN "Attendance" a ON a."userId" = s."userId" AND a.date = ${date.toISOString().split('T')[0]}::date
      WHERE c."schoolId" = ${schoolId}::uuid
      GROUP BY c.id, c."className"
      ORDER BY c."className"
    `;

    // 4. MONTHLY TRENDS
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const monthlyTrend = await prisma.$queryRaw`
      SELECT 
        DATE(a.date) as date,
        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late,
        COUNT(CASE WHEN a.status = 'HALF_DAY' THEN 1 END) as "halfDay",
        COUNT(CASE WHEN a.status = 'ON_LEAVE' THEN 1 END) as "onLeave"
      FROM "Attendance" a
      WHERE a."schoolId" = ${schoolId}::uuid
        AND a.date >= ${monthStart.toISOString().split('T')[0]}::date
        AND a.date <= ${monthEnd.toISOString().split('T')[0]}::date
      GROUP BY DATE(a.date)
      ORDER BY date DESC
      LIMIT 30
    `;

    // 5. PENDING APPROVALS
    const pendingApprovals = await prisma.attendance.count({
      where: {
        schoolId,
        approvalStatus: 'PENDING',
        requiresApproval: true,
      }
    });

    const pendingLeaves = await prisma.leaveRequest.count({
      where: { schoolId, status: 'PENDING' }
    });

    // 6. LOW ATTENDANCE ALERTS
    const lowAttendanceUsers = await prisma.attendanceStats.findMany({
      where: {
        schoolId,
        academicYearId: academicYear.id,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        attendancePercentage: { lt: 75 }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } },
            student: {
              select: {
                class: { select: { className: true } },
                section: { select: { name: true } },
                admissionNo: true,
              }
            }
          }
        }
      },
      orderBy: { attendancePercentage: 'asc' },
      take: 20,
    });

    // 7. RECENT ACTIVITY
    const recentActivity = await prisma.attendance.findMany({
      where: { schoolId, date: new Date(date.toDateString()) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
            role: { select: { name: true } },
            student: {
              select: {
                class: { select: { className: true } },
                admissionNo: true,
              }
            }
          }
        },
        marker: { select: { name: true } }
      },
      orderBy: { markedAt: 'desc' },
      take: 50,
    });

    // 8. DETAILED LIST WITH PAGINATION
    const skip = (page - 1) * limit;

    const [attendanceRecords, totalRecords] = await Promise.all([
      prisma.attendance.findMany({
        where: attendanceWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
              role: { select: { name: true } },
              student: {
                select: {
                  class: { select: { className: true } },
                  section: { select: { name: true } },
                  admissionNo: true,
                }
              },
              teacher: {
                select: {
                  employeeId: true,
                  designation: true,
                }
              }
            }
          },
          marker: { select: { name: true } },
          approver: { select: { name: true } }
        },
        orderBy: [
          { date: 'desc' },
          { markedAt: 'desc' }
        ],
        skip,
        take: limit,
      }),
      prisma.attendance.count({ where: attendanceWhere })
    ]);

    // 9. SUMMARY STATS FOR DATE RANGE
    let rangeStats = null;
    if (startDate && endDate) {
      rangeStats = await prisma.attendance.groupBy({
        by: ['status'],
        where: {
          schoolId,
          date: { gte: startDate, lte: endDate }
        },
        _count: { id: true }
      });
    }

    return NextResponse.json({
      todayOverview,
      roleWiseStats: roleWiseStats.map(stat => ({
        ...stat,
        totalUsers: Number(stat.totalUsers),
        present: Number(stat.present),
        absent: Number(stat.absent),
        late: Number(stat.late),
        halfDay: Number(stat.halfDay),
        onLeave: Number(stat.onLeave),
      })),
      classWiseStats: classWiseStats.map(stat => ({
        ...stat,
        totalStudents: Number(stat.totalStudents),
        present: Number(stat.present),
        absent: Number(stat.absent),
        late: Number(stat.late),
        attendancePercentage: Number(stat.attendancePercentage || 0),
      })),
      monthlyTrend: monthlyTrend.map(day => ({
        ...day,
        present: Number(day.present),
        absent: Number(day.absent),
        late: Number(day.late),
        halfDay: Number(day.halfDay),
        onLeave: Number(day.onLeave),
      })),
      alerts: {
        pendingApprovals,
        pendingLeaves,
        lowAttendanceCount: lowAttendanceUsers.length,
      },
      lowAttendanceUsers,
      recentActivity,
      attendanceRecords,
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
      rangeStats: rangeStats ? rangeStats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count.id;
        return acc;
      }, {}) : null,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({
      error: 'Failed to fetch attendance dashboard',
      details: error.message
    }, { status: 500 });
  }
}

// Export report
export async function POST(req, { params }) {
  const { schoolId } = params;
  const body = await req.json();
  const { startDate, endDate, format, roleId, classId } = body;

  try {
    // Generate comprehensive report
    const reportData = await prisma.attendance.findMany({
      where: {
        schoolId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        ...(roleId && { user: { roleId: parseInt(roleId) } }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: { select: { name: true } },
            student: {
              select: {
                admissionNo: true,
                class: { select: { className: true } },
                section: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { user: { name: 'asc' } }
      ]
    });

    // Format based on request (CSV, PDF, Excel)
    // Implementation depends on format

    return NextResponse.json({
      success: true,
      reportData,
      format,
      generatedAt: new Date(),
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}