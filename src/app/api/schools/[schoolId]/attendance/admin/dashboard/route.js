// app/api/schools/[schoolId]/attendance/admin/dashboard/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import dayjs from "dayjs";

export async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const { searchParams } = new URL(req.url);
  const dateString = searchParams.get('date');
  const date = dateString
    ? new Date(dateString + "T00:00:00.000Z")
    : new Date();

  const startDate = searchParams.get('startDate')
    ? dayjs(searchParams.get('startDate')).toDate()
    : null;

  const endDate = searchParams.get('endDate')
    ? dayjs(searchParams.get('endDate')).toDate()
    : null;

  const status = searchParams.get('status');

  try {
    if (!schoolId) {
      return NextResponse.json(
        { message: 'Missing schoolId in request parameters' },
        { status: 400 }
      );
    }

    const today = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    ));
    const todayStr = today.toISOString().split('T')[0];

    // PARALLEL BATCH 1: Calendar, Academic Year, Today Stats
    const [calendar, academicYear, todayStats] = await Promise.all([
      prisma.schoolCalendar.findUnique({
        where: { schoolId_date: { schoolId, date: today } }
      }),
      prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true, startDate: true, endDate: true }
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { schoolId, date: today },
        _count: { id: true },
      })
    ]);

    if (!academicYear) {
      return NextResponse.json({ error: 'No active academic year' }, { status: 404 });
    }

    // Day info
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0;
    const isWorkingDay = calendar ? calendar.dayType === 'WORKING_DAY' : !isWeekend;
    const dayInfo = {
      date: today.toISOString(),
      isWorkingDay,
      dayType: calendar?.dayType || (isWeekend ? 'WEEKEND' : 'WORKING_DAY'),
      holidayName: calendar?.holidayName
    };

    // Today overview from batch 1
    const todayOverview = {
      date: today.toISOString(),
      total: todayStats.reduce((sum, s) => sum + s._count.id, 0),
      present: todayStats.find(s => s.status === 'PRESENT')?._count.id || 0,
      absent: todayStats.find(s => s.status === 'ABSENT')?._count.id || 0,
      late: todayStats.find(s => s.status === 'LATE')?._count.id || 0,
      halfDay: todayStats.find(s => s.status === 'HALF_DAY')?._count.id || 0,
      onLeave: todayStats.find(s => s.status === 'ON_LEAVE')?._count.id || 0,
    };

    // Monthly date range
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // PARALLEL BATCH 2: All remaining queries
    const [
      notMarkedCount,
      roleWiseStats,
      classWiseStats,
      teacherActivity,
      monthlyTrend,
      pendingApprovals,
      pendingLeaves,
      workingDaysCount,
      lowAttendanceUsers,
      recentActivity
    ] = await Promise.all([
      // Not marked count
      prisma.user.count({
        where: {
          schoolId,
          deletedAt: null,
          status: 'ACTIVE',
          attendance: { none: { date: today } }
        }
      }),

      // Role-wise stats (raw SQL is already optimized)
      prisma.$queryRaw`
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
        LEFT JOIN "Attendance" a ON a."userId" = u.id AND a.date = ${todayStr}::date
        WHERE r.name IN ('STUDENT', 'TEACHING_STAFF', 'NON_TEACHING_STAFF', 'ADMIN')
        GROUP BY r.id, r.name
        ORDER BY r.name
      `,

      // Class-wise stats
      prisma.$queryRaw`
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
        LEFT JOIN "Attendance" a ON a."userId" = s."userId" AND a.date = ${todayStr}::date
        WHERE c."schoolId" = ${schoolId}::uuid
        GROUP BY c.id, c."className"
        ORDER BY c."className"
      `,

      // Teacher activity (simplified - no streak calculation per teacher)
      prisma.attendance.findMany({
        where: {
          schoolId,
          date: today,
          user: { role: { name: 'TEACHING_STAFF' } }
        },
        select: {
          userId: true,
          checkInTime: true,
          checkOutTime: true,
          workingHours: true,
          status: true,
          isLateCheckIn: true,
          lateByMinutes: true,
          checkInLocation: true,
          checkOutLocation: true,
          deviceInfo: true,
          remarks: true,
          user: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
              teacher: {
                select: { employeeId: true, designation: true }
              }
            }
          }
        },
        orderBy: { checkInTime: 'desc' },
        take: 30  // Limit for performance
      }),

      // Monthly trend
      prisma.$queryRaw`
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
      `,

      // Pending approvals
      prisma.attendance.count({
        where: { schoolId, approvalStatus: 'PENDING', requiresApproval: true }
      }),

      // Pending leaves
      prisma.leaveRequest.count({
        where: { schoolId, status: 'PENDING' }
      }),

      // Working days count
      prisma.schoolCalendar.count({
        where: {
          schoolId,
          dayType: 'WORKING_DAY',
          date: { gte: monthStart, lte: today }
        }
      }),

      // Low attendance users (optimized query with limit)
      prisma.attendanceStats.findMany({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          attendancePercentage: { lt: 75 }
        },
        select: {
          attendancePercentage: true,
          totalPresent: true,
          totalAbsent: true,
          user: {
            select: {
              id: true,
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
        orderBy: { attendancePercentage: 'asc' },
        take: 10  // Reduced from 20
      }),

      // Recent activity (reduced and simplified)
      prisma.attendance.findMany({
        where: { schoolId, date: today },
        select: {
          id: true,
          status: true,
          checkInTime: true,
          markedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
              role: { select: { name: true } },
              student: {
                select: {
                  admissionNo: true,
                  class: { select: { className: true } }
                }
              }
            }
          },
          marker: { select: { name: true } }
        },
        orderBy: { markedAt: 'desc' },
        take: 20  // Reduced from 50
      })
    ]);

    todayOverview.notMarked = notMarkedCount;

    const MIN_WORKING_DAYS = 10;
    const hasInsufficientData = workingDaysCount < MIN_WORKING_DAYS;

    // Format teacher activity (without expensive streak calculation)
    const teacherActivityFormatted = teacherActivity.map(att => ({
      userId: att.user.id,
      name: att.user.name,
      employeeId: att.user.teacher?.employeeId,
      designation: att.user.teacher?.designation,
      profilePicture: att.user.profilePicture,
      checkInTime: att.checkInTime,
      checkOutTime: att.checkOutTime,
      workingHours: att.workingHours || 0,
      status: att.status,
      isLateCheckIn: att.isLateCheckIn,
      lateByMinutes: att.lateByMinutes,
      location: {
        checkIn: att.checkInLocation,
        checkOut: att.checkOutLocation
      },
      deviceInfo: att.deviceInfo,
      remarks: att.remarks
    }));

    return NextResponse.json({
      dayInfo,
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
      teacherActivity: teacherActivityFormatted,
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
        lowAttendanceCount: hasInsufficientData ? 0 : lowAttendanceUsers.length,
        hasInsufficientData,
        workingDaysCount,
        minWorkingDays: MIN_WORKING_DAYS,
      },
      lowAttendanceUsers: hasInsufficientData ? [] : lowAttendanceUsers,
      recentActivity,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
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