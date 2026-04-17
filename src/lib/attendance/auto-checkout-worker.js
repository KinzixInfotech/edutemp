import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';
import { createAttendanceAuditLog } from '@/lib/attendance/audit';
import {
  AUTO_CHECKOUT_WARNING_MINUTES,
  calculateWorkingHours,
  computeAttendanceWindows,
  getAttendanceConfigSnapshot,
  getCheckoutAttendanceStatus,
  getOvertimeState,
  resolveAttendanceCheckoutDeadline,
} from '@/lib/attendance/config';
import { getDateKey, getSchoolTimezone } from '@/lib/attendance/timezone';
import { getTeacherShiftAttendanceWindow } from '@/lib/attendance/shifts';
import { getPayrollConfigForSchool } from '@/lib/payroll/config';

const STAFF_ROLE_NAMES = ['TEACHER', 'STAFF', 'ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN'];

function isWithinWindow(targetTime, now, windowMinutes) {
  const diffMs = Math.abs(new Date(targetTime).getTime() - new Date(now).getTime());
  return diffMs <= windowMinutes * 60 * 1000;
}

function buildRuleKey(ruleType, schoolId, triggerAt) {
  return `${ruleType}:${schoolId}:${new Date(triggerAt).toISOString()}`;
}

async function sendGroupedNotifications(plans, now = new Date()) {
  const entries = Array.from(plans.values());

  for (const plan of entries) {
    const existing = await prisma.cronNotificationLog.findMany({
      where: {
        schoolId: plan.schoolId,
        userId: { in: plan.userIds },
        ruleKey: plan.ruleKey,
      },
      select: { userId: true },
    });

    const sentUserIds = new Set(existing.map((item) => item.userId));
    const targetUserIds = plan.userIds.filter((userId) => !sentUserIds.has(userId));

    if (!targetUserIds.length) {
      continue;
    }

    await sendNotification({
      schoolId: plan.schoolId,
      title: plan.title,
      message: plan.message,
      type: 'ATTENDANCE',
      priority: 'NORMAL',
      icon: '🕒',
      targetOptions: { userIds: targetUserIds },
      metadata: {
        type: plan.payloadType,
        schoolId: plan.schoolId,
        attendanceIds: plan.attendanceIds,
        ruleType: plan.ruleType,
        scheduledAt: now.toISOString(),
      },
      actionUrl: '/dashboard/markattendance',
      sendPush: true,
    });

    await prisma.cronNotificationLog.createMany({
      data: targetUserIds.map((userId) => ({
        schoolId: plan.schoolId,
        userId,
        ruleType: plan.ruleType,
        ruleKey: plan.ruleKey,
        title: plan.title,
        message: plan.message,
        priority: 'NORMAL',
      })),
      skipDuplicates: true,
    });

    console.log('[attendance/worker] lifecycle-notification', {
      schoolId: plan.schoolId,
      ruleType: plan.ruleType,
      usersNotified: targetUserIds,
      attendanceIds: plan.attendanceIds,
    });
  }
}

function queueNotification(plans, {
  schoolId,
  userId,
  attendanceId,
  ruleType,
  triggerAt,
  title,
  message,
  payloadType,
}) {
  const ruleKey = buildRuleKey(ruleType, schoolId, triggerAt);
  if (!plans.has(ruleKey)) {
    plans.set(ruleKey, {
      schoolId,
      userIds: [],
      attendanceIds: [],
      ruleType,
      ruleKey,
      title,
      message,
      payloadType,
    });
  }

  const entry = plans.get(ruleKey);
  entry.userIds.push(userId);
  entry.attendanceIds.push(attendanceId);
}

async function finalizeAttendance({
  attendance,
  config,
  school,
  payrollConfig,
  shiftWindow,
  checkoutTime,
  checkoutType,
}) {
  const timezone = getSchoolTimezone(school);
  const configWithTimezone = { ...config, school, timezone };
  const dateKey = getDateKey(attendance.date, timezone);
  const windows = computeAttendanceWindows(configWithTimezone, dateKey, shiftWindow || {});
  const workingHours = calculateWorkingHours(attendance.checkInTime, checkoutTime);
  const rawStatus = getCheckoutAttendanceStatus(workingHours, configWithTimezone);
  const status = attendance.status === 'LATE' && rawStatus === 'PRESENT' ? 'LATE' : rawStatus;
  const overtimeState = getOvertimeState({
    workingHours,
    standardWorkingHours: payrollConfig.standardWorkingHours,
    overtimeEnabled: payrollConfig.enableOvertime,
    overtimeRequiresApproval: payrollConfig.overtimeRequiresApproval,
  });

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      status,
      checkOutTime: checkoutTime,
      workingHours,
      overtimeHours: overtimeState.overtimeHours,
      overtimeStatus: overtimeState.overtimeStatus,
      overtimeApprovedBy: null,
      overtimeApprovedAt: overtimeState.overtimeStatus === 'APPROVED' ? new Date() : null,
      checkoutType,
    },
  });

  await createAttendanceAuditLog({
    userId: attendance.userId,
    schoolId: attendance.schoolId,
    attendanceId: attendance.id,
    action: checkoutType === 'EXTENDED_AUTO' ? 'EXTENDED_AUTO_CHECKOUT' : 'AUTO_CHECKOUT',
    payload: {
      date: dateKey,
      checkoutTime: checkoutTime.toISOString(),
      checkoutType,
      shiftWindow,
      computedWindow: {
        checkOutDeadline: windows.checkOutDeadline.toISOString(),
        autoCheckoutCutoff: windows.autoCheckoutCutoff.toISOString(),
        maxExtendedCheckoutEnd: windows.maxExtendedCheckoutEnd.toISOString(),
      },
      workingHours,
      overtimeHours: overtimeState.overtimeHours,
      overtimeStatus: overtimeState.overtimeStatus,
      status,
    },
  });

  return updated;
}

export async function processAttendanceLifecycleWorker({
  now = new Date(),
  windowMinutes = 2,
} = {}) {
  const openAttendances = await prisma.attendance.findMany({
    where: {
      checkInTime: { not: null },
      checkOutTime: null,
      user: {
        role: {
          name: { in: STAFF_ROLE_NAMES },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: { select: { name: true } },
        },
      },
      school: {
        select: {
          id: true,
          websiteConfig: true,
        },
      },
    },
    orderBy: { checkInTime: 'asc' },
  });

  if (!openAttendances.length) {
    return {
      scannedOpenAttendances: 0,
      remindersQueued: 0,
      autoCheckedOut: 0,
    };
  }

  const schoolIds = [...new Set(openAttendances.map((item) => item.schoolId))];
  const [configs, payrollConfigs] = await Promise.all([
    prisma.attendanceConfig.findMany({
      where: { schoolId: { in: schoolIds } },
    }),
    Promise.all(schoolIds.map((schoolId) => getPayrollConfigForSchool(schoolId))),
  ]);

  const configBySchoolId = new Map(configs.map((config) => [config.schoolId, config]));
  const payrollConfigBySchoolId = new Map(payrollConfigs.map((config) => [config.schoolId, config]));
  const notificationPlans = new Map();
  let autoCheckedOut = 0;

  for (const attendance of openAttendances) {
    const config = configBySchoolId.get(attendance.schoolId);
    if (!config) {
      continue;
    }

    const school = attendance.school;
    const timezone = getSchoolTimezone(school);
    const dateKey = getDateKey(attendance.date, timezone);
    const shiftWindow = await getTeacherShiftAttendanceWindow({
      schoolId: attendance.schoolId,
      userId: attendance.userId,
      targetDate: attendance.date,
      timezone,
    });
    const configWithTimezone = { ...config, school, timezone };
    const windows = computeAttendanceWindows(configWithTimezone, dateKey, shiftWindow || {});
    const effectiveCutoff = resolveAttendanceCheckoutDeadline(attendance, windows);
    const payrollConfig = payrollConfigBySchoolId.get(attendance.schoolId);

    if (effectiveCutoff <= now && payrollConfig) {
      await finalizeAttendance({
        attendance,
        config,
        school,
        payrollConfig,
        shiftWindow,
        checkoutTime: effectiveCutoff,
        checkoutType: attendance.isExtended ? 'EXTENDED_AUTO' : 'AUTO',
      });
      autoCheckedOut += 1;
      continue;
    }

    if (isWithinWindow(windows.checkOutDeadline, now, windowMinutes)) {
      queueNotification(notificationPlans, {
        schoolId: attendance.schoolId,
        userId: attendance.userId,
        attendanceId: attendance.id,
        ruleType: 'ATTENDANCE_END_OF_DAY_CHECKOUT',
        triggerAt: windows.checkOutDeadline,
        title: 'Check-out Reminder',
        message: 'School day ended. Please check out.',
        payloadType: 'CHECK_OUT',
      });
    }

    const autoWarningAt = new Date(effectiveCutoff.getTime() - AUTO_CHECKOUT_WARNING_MINUTES * 60 * 1000);
    if (isWithinWindow(autoWarningAt, now, windowMinutes) && autoWarningAt > windows.checkOutDeadline) {
      queueNotification(notificationPlans, {
        schoolId: attendance.schoolId,
        userId: attendance.userId,
        attendanceId: attendance.id,
        ruleType: attendance.isExtended ? 'ATTENDANCE_EXTENDED_AUTO_WARNING' : 'ATTENDANCE_AUTO_CHECKOUT_WARNING',
        triggerAt: autoWarningAt,
        title: 'Auto Check-out Soon',
        message: 'Auto checkout will happen soon if you do not check out manually.',
        payloadType: 'CHECK_OUT',
      });
    }
  }

  await sendGroupedNotifications(notificationPlans, now);

  return {
    scannedOpenAttendances: openAttendances.length,
    remindersQueued: notificationPlans.size,
    autoCheckedOut,
  };
}
