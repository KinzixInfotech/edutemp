// app/api/schools/[schoolId]/attendance/admin/dashboard/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import dayjs from "dayjs";
export async function GET(req, { params }) {
  const { schoolId } = params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date')
    ? dayjs(searchParams.get('date')).toDate()
    : new Date();

  const startDate = searchParams.get('startDate')
    ? dayjs(searchParams.get('startDate')).toDate()
    : null;

  const endDate = searchParams.get('endDate')
    ? dayjs(searchParams.get('endDate')).toDate()
    : null;

  const roleId = searchParams.get('roleId');
  const classId = searchParams.get('classId');
  const status = searchParams.get('status');

  try {
    // Check if schoolId exists
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

    // Check if today is a working day
    const today = new Date(date.toDateString());
    const calendar = await prisma.schoolCalendar.findUnique({
      where: { schoolId_date: { schoolId, date: today } }
    });

    const isWorkingDay = calendar?.dayType === 'WORKING_DAY';
    const dayInfo = {
      date: today.toISOString(),
      isWorkingDay,
      dayType: calendar?.dayType || 'UNKNOWN',
      holidayName: calendar?.holidayName
    };

    // Build filter conditions
    const attendanceWhere = {
      schoolId,
      ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : { date: today }),
      ...(status && { status }),
    };

    // 1. TODAY'S OVERVIEW
    const todayStats = await prisma.attendance.groupBy({
      by: ['status'],
      where: { schoolId, date: today },
      _count: { id: true },
    });

    const todayOverview = {
      date: today.toISOString(),
      total: todayStats.reduce((sum, s) => sum + s._count.id, 0),
      present: todayStats.find(s => s.status === 'PRESENT')?._count.id || 0,
      absent: todayStats.find(s => s.status === 'ABSENT')?._count.id || 0,
      late: todayStats.find(s => s.status === 'LATE')?._count.id || 0,
      halfDay: todayStats.find(s => s.status === 'HALF_DAY')?._count.id || 0,
      onLeave: todayStats.find(s => s.status === 'ON_LEAVE')?._count.id || 0,
    };

    // Count users who haven't marked attendance
    todayOverview.notMarked = await prisma.user.count({
      where: {
        schoolId,
        deletedAt: null,
        status: 'ACTIVE',
        attendance: {
          none: { date: today }
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
      LEFT JOIN "Attendance" a ON a."userId" = u.id AND a.date = ${today.toISOString().split('T')[0]}::date
      WHERE r.name IN ('Student', 'TEACHING_STAFF', 'NonTeachingStaff', 'Admin')
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
      LEFT JOIN "Attendance" a ON a."userId" = s."userId" AND a.date = ${today.toISOString().split('T')[0]}::date
      WHERE c."schoolId" = ${schoolId}::uuid
      GROUP BY c.id, c."className"
      ORDER BY c."className"
    `;

    // 4. TEACHER ACTIVITY WITH DEVICE & LOCATION
    const teacherActivity = await prisma.attendance.findMany({
      where: {
        schoolId,
        date: today,
        user: {
          role: { name: 'TEACHING_STAFF' }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            teacher: {
              select: {
                employeeId: true,
                designation: true
              }
            }
          }
        }
      },
      orderBy: { checkInTime: 'desc' }
    });

    // Calculate streaks for teachers
    const teacherActivityWithStreaks = await Promise.all(
      teacherActivity.map(async (att) => {
        // Calculate consecutive attendance days
        const streak = await calculateUserStreak(att.userId, schoolId);

        return {
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
          streak: streak,
          remarks: att.remarks
        };
      })
    );

    // 5. MONTHLY TRENDS
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

    // 6. PENDING APPROVALS
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

    // 7. LOW ATTENDANCE ALERTS
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

    // 8. RECENT ACTIVITY
    const recentActivity = await prisma.attendance.findMany({
      where: { schoolId, date: today },
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
      teacherActivity: teacherActivityWithStreaks,
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

// Helper function to calculate consecutive attendance streak
async function calculateUserStreak(userId, schoolId) {
  try {
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId,
        schoolId,
        status: { in: ['PRESENT', 'LATE'] }
      },
      orderBy: { date: 'desc' },
      take: 100,
      select: { date: true }
    });

    if (attendanceRecords.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const record of attendanceRecords) {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24));

      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Streak calculation error:', error);
    return 0;
  }
}