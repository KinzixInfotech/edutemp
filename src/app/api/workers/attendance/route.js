import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';
import { createAttendanceAuditLog } from '@/lib/attendance/audit';

const IS_DEV = process.env.NODE_ENV === 'development';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';

async function handleWorker(req) {
  const { schoolId, attendanceId, userId, action, securityAssessment } = await req.json();

  if (!schoolId || !attendanceId || !userId || !action) {
    return NextResponse.json({ error: 'schoolId, attendanceId, userId, and action are required' }, { status: 400 });
  }

  const [attendance, config, user] = await Promise.all([
    prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        user: {
          select: { name: true, role: { select: { name: true } } },
        },
      },
    }),
    prisma.attendanceConfig.findUnique({
      where: { schoolId },
      select: { minAttendancePercent: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
  ]);

  if (!attendance) {
    return NextResponse.json({ error: 'Attendance not found' }, { status: 404 });
  }

  const suspiciousSignals = securityAssessment?.suspiciousSignals || [];
  const belowThreshold = attendance.userId && config?.minAttendancePercent != null
    ? await prisma.attendanceStats.findFirst({
      where: {
        userId: attendance.userId,
        schoolId,
        attendancePercentage: { lt: config.minAttendancePercent },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { attendancePercentage: true, month: true, year: true },
    })
    : null;

  if (suspiciousSignals.length > 0) {
    await createAttendanceAuditLog({
      userId,
      schoolId,
      attendanceId,
      action: `${action}_SUSPICIOUS`,
      payload: {
        suspiciousSignals,
        attendanceDate: attendance.date,
      },
    });

    await sendNotification({
      schoolId,
      title: 'Suspicious Attendance Attempt',
      message: `${user?.name || 'User'} marked attendance with flags: ${suspiciousSignals.join(', ')}`,
      type: 'ATTENDANCE',
      priority: 'HIGH',
      icon: '🛡️',
      targetOptions: { roleNames: ['ADMIN', 'DIRECTOR', 'PRINCIPAL'] },
      metadata: {
        attendanceId,
        userId,
        suspiciousSignals,
      },
    });
  }

  if (belowThreshold) {
    await sendNotification({
      schoolId,
      title: 'Attendance Below Threshold',
      message: `${attendance.user?.name || user?.name || 'User'} is at ${belowThreshold.attendancePercentage}% attendance, below the configured threshold.`,
      type: 'ATTENDANCE',
      priority: 'NORMAL',
      icon: '📉',
      targetOptions: { roleNames: ['ADMIN', 'DIRECTOR', 'PRINCIPAL'] },
      metadata: {
        attendanceId,
        userId,
        thresholdMonth: belowThreshold.month,
        thresholdYear: belowThreshold.year,
        attendancePercentage: belowThreshold.attendancePercentage,
      },
    });
  }

  return NextResponse.json({
    success: true,
    suspiciousSignals,
    belowThreshold: belowThreshold?.attendancePercentage ?? null,
  });
}

export async function POST(req) {
  if (IS_DEV) {
    const key = req.headers.get('x-internal-key');
    if (key !== INTERNAL_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handleWorker(req);
  }

  return verifySignatureAppRouter(handleWorker)(req);
}
