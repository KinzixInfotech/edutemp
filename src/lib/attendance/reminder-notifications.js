import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';
import { getDateKey, zonedDateToDbDate } from '@/lib/attendance/timezone';

const DEFAULT_PARENT_NOTIFY_BEFORE_MINUTES = 30;
const DEFAULT_TRIGGER_WINDOW_MINUTES = 2;

function formatTimeLabel(timeString) {
  const [hourRaw = '0', minuteRaw = '0'] = String(timeString || '00:00').split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function chunk(array, size = 10) {
  const result = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTriggerRow(row) {
  return {
    ...row,
    gracePeriodMinutes: toNumber(row.gracePeriodMinutes),
    parentNotifyBeforeMinutes: toNumber(row.parentNotifyBeforeMinutes, DEFAULT_PARENT_NOTIFY_BEFORE_MINUTES),
    localMinuteOfDay: toNumber(row.localMinuteOfDay),
    startMinuteOfDay: toNumber(row.startMinuteOfDay),
    endMinuteOfDay: toNumber(row.endMinuteOfDay),
    teacherClosingReminderMinute: toNumber(row.teacherClosingReminderMinute, -1),
    parentStartReminderMinute: toNumber(row.parentStartReminderMinute, -1),
  };
}

function getTeacherPlans(trigger) {
  return [
    trigger.teacherCheckInOpen ? {
      ruleType: 'ATTENDANCE_TEACHER_CHECK_IN_OPEN',
      payloadType: 'CHECK_IN',
      title: 'Attendance Reminder',
      message: 'Check-in window is open. Please mark your attendance.',
      candidateGroup: 'teachersNotCheckedIn',
      triggerTime: trigger.defaultStartTime,
      notificationType: 'ATTENDANCE',
    } : null,
    trigger.teacherCheckInClosingReminder ? {
      ruleType: 'ATTENDANCE_TEACHER_CHECK_IN_LAST_HOUR',
      payloadType: 'CHECK_IN',
      title: 'Attendance Reminder',
      message: 'Reminder: Only 1 hour left to mark your attendance.',
      candidateGroup: 'teachersNotCheckedIn',
      triggerTime: trigger.closingReminderTime,
      notificationType: 'ATTENDANCE',
    } : null,
    trigger.teacherCheckOutOpen ? {
      ruleType: 'ATTENDANCE_TEACHER_CHECK_OUT_OPEN',
      payloadType: 'CHECK_OUT',
      title: 'Attendance Reminder',
      message: 'Check-out window is open. Please mark your check-out.',
      candidateGroup: 'teachersNotCheckedOut',
      triggerTime: trigger.defaultEndTime,
      notificationType: 'ATTENDANCE',
    } : null,
  ].filter(Boolean);
}

function getParentPlans(trigger) {
  return [
    trigger.parentSchoolStartingSoon ? {
      ruleType: 'ATTENDANCE_PARENT_SCHOOL_STARTING_SOON',
      payloadType: 'PARENT_REMINDER',
      title: 'School Reminder',
      message: `School will start at ${formatTimeLabel(trigger.defaultStartTime)}. Please get your child ready.`,
      candidateGroup: 'parents',
      triggerTime: trigger.parentStartReminderTime,
      notificationType: 'DAILY_REMINDER',
    } : null,
    trigger.parentPickupReminder ? {
      ruleType: 'ATTENDANCE_PARENT_PICKUP_REMINDER',
      payloadType: 'PARENT_REMINDER',
      title: 'Pickup Reminder',
      message: 'School is ending now. Please be ready for pickup.',
      candidateGroup: 'parents',
      triggerTime: trigger.defaultEndTime,
      notificationType: 'DAILY_REMINDER',
    } : null,
  ].filter(Boolean);
}

async function findRelevantSchoolsForAttendanceNotifications(now = new Date(), windowMinutes = DEFAULT_TRIGGER_WINDOW_MINUTES) {
  const effectiveWindow = Math.max(0, Number(windowMinutes) || DEFAULT_TRIGGER_WINDOW_MINUTES);

  return prisma.$queryRawUnsafe(
    `
      WITH school_times AS (
        SELECT
          ac."schoolId",
          ac."defaultStartTime",
          ac."defaultEndTime",
          ac."gracePeriodMinutes",
          ac."sendDailyReminders",
          ac."notifyParents",
          COALESCE(NULLIF(s."websiteConfig"->>'timezone', ''), 'Asia/Kolkata') AS timezone,
          COALESCE(
            CASE
              WHEN COALESCE(s."websiteConfig"->>'parentNotifyBeforeMinutes', '') ~ '^[0-9]+$'
              THEN (s."websiteConfig"->>'parentNotifyBeforeMinutes')::int
              ELSE NULL
            END,
            $1
          ) AS "parentNotifyBeforeMinutes",
          (
            EXTRACT(HOUR FROM ($2::timestamptz AT TIME ZONE COALESCE(NULLIF(s."websiteConfig"->>'timezone', ''), 'Asia/Kolkata')))::int * 60
            + EXTRACT(MINUTE FROM ($2::timestamptz AT TIME ZONE COALESCE(NULLIF(s."websiteConfig"->>'timezone', ''), 'Asia/Kolkata')))::int
          ) AS "localMinuteOfDay"
        FROM "AttendanceConfig" ac
        INNER JOIN "School" s ON s.id = ac."schoolId"
        WHERE s."deletedAt" IS NULL
      ),
      trigger_times AS (
        SELECT
          *,
          (split_part("defaultStartTime", ':', 1)::int * 60 + split_part("defaultStartTime", ':', 2)::int) AS "startMinuteOfDay",
          (split_part("defaultEndTime", ':', 1)::int * 60 + split_part("defaultEndTime", ':', 2)::int) AS "endMinuteOfDay"
        FROM school_times
      ),
      evaluated AS (
        SELECT
          *,
          ("startMinuteOfDay" + "gracePeriodMinutes" - 60) AS "teacherClosingReminderMinute",
          ("startMinuteOfDay" - "parentNotifyBeforeMinutes") AS "parentStartReminderMinute",
          ABS("localMinuteOfDay" - "startMinuteOfDay") <= $3 AS "teacherCheckInOpen",
          CASE
            WHEN ("startMinuteOfDay" + "gracePeriodMinutes" - 60) >= 0
            THEN ABS("localMinuteOfDay" - ("startMinuteOfDay" + "gracePeriodMinutes" - 60)) <= $3
            ELSE FALSE
          END AS "teacherCheckInClosingReminder",
          ABS("localMinuteOfDay" - "endMinuteOfDay") <= $3 AS "teacherCheckOutOpen",
          CASE
            WHEN ("startMinuteOfDay" - "parentNotifyBeforeMinutes") >= 0
            THEN ABS("localMinuteOfDay" - ("startMinuteOfDay" - "parentNotifyBeforeMinutes")) <= $3
            ELSE FALSE
          END AS "parentSchoolStartingSoon",
          ABS("localMinuteOfDay" - "endMinuteOfDay") <= $3 AS "parentPickupReminder"
        FROM trigger_times
      )
      SELECT *
      FROM evaluated
      WHERE
        (
          "sendDailyReminders" = true
          AND (
            "teacherCheckInOpen" = true
            OR "teacherCheckInClosingReminder" = true
            OR "teacherCheckOutOpen" = true
          )
        )
        OR (
          "notifyParents" = true
          AND (
            "parentSchoolStartingSoon" = true
            OR "parentPickupReminder" = true
          )
        )
    `,
    DEFAULT_PARENT_NOTIFY_BEFORE_MINUTES,
    now.toISOString(),
    effectiveWindow,
  );
}

async function sendReminderPlan({
  schoolId,
  timezone,
  localDateKey,
  userIds,
  skippedAlreadyActed = [],
  plan,
  now,
}) {
  if (!userIds.length) {
    console.log('[attendance/worker] reminder-skip-empty', {
      schoolId,
      ruleType: plan.ruleType,
      skippedAlreadyActed,
    });
    return {
      attempted: 0,
      notified: 0,
      skippedAlreadyActed,
      skippedAlreadySent: [],
      ruleType: plan.ruleType,
    };
  }

  const ruleKey = `${plan.ruleType}:${schoolId}:${localDateKey}:${plan.triggerTime}`;
  const existing = await prisma.cronNotificationLog.findMany({
    where: {
      schoolId,
      userId: { in: userIds },
      ruleKey,
    },
    select: { userId: true },
  });

  const alreadySent = new Set(existing.map((item) => item.userId));
  const targetUserIds = userIds.filter((userId) => !alreadySent.has(userId));
  const skippedAlreadySent = userIds.filter((userId) => alreadySent.has(userId));

  if (!targetUserIds.length) {
    console.log('[attendance/worker] reminder-skip-duplicate', {
      schoolId,
      ruleType: plan.ruleType,
      skippedAlreadyActed,
      skippedAlreadySent,
    });
    return {
      attempted: userIds.length,
      notified: 0,
      skippedAlreadyActed,
      skippedAlreadySent,
      ruleType: plan.ruleType,
    };
  }

  await sendNotification({
    schoolId,
    title: plan.title,
    message: plan.message,
    type: plan.notificationType,
    priority: 'NORMAL',
    icon: plan.payloadType === 'PARENT_REMINDER' ? '🏫' : '🕒',
    targetOptions: { userIds: targetUserIds },
    metadata: {
      schoolId,
      timezone,
      type: plan.payloadType,
      ruleType: plan.ruleType,
      localDateKey,
      triggerTime: plan.triggerTime,
      scheduledAt: now.toISOString(),
      targetUserIds,
    },
    actionUrl: plan.payloadType === 'PARENT_REMINDER' ? '/dashboard' : '/attendance',
    sendPush: true,
  });

  await prisma.cronNotificationLog.createMany({
    data: targetUserIds.map((userId) => ({
      schoolId,
      userId,
      ruleType: plan.ruleType,
      ruleKey,
      title: plan.title,
      message: plan.message,
      priority: 'NORMAL',
    })),
    skipDuplicates: true,
  });

  console.log('[attendance/worker] reminder-sent', {
    schoolId,
    ruleType: plan.ruleType,
    usersNotified: targetUserIds,
    skippedAlreadyActed,
    skippedAlreadySent,
  });

  return {
    attempted: userIds.length,
    notified: targetUserIds.length,
    skippedAlreadyActed,
    skippedAlreadySent,
    ruleType: plan.ruleType,
  };
}

async function processSchoolReminderTriggers(trigger, now = new Date()) {
  const normalizedTrigger = normalizeTriggerRow(trigger);
  const timezone = normalizedTrigger.timezone || 'Asia/Kolkata';
  const localDateKey = getDateKey(now, timezone);
  const localDate = zonedDateToDbDate(now, timezone);

  const [calendar, teachers, parents, attendanceToday] = await Promise.all([
    prisma.schoolCalendar.findUnique({
      where: {
        schoolId_date: {
          schoolId: normalizedTrigger.schoolId,
          date: localDate,
        },
      },
      select: { dayType: true, holidayName: true },
    }),
    prisma.teachingStaff.findMany({
      where: {
        schoolId: normalizedTrigger.schoolId,
        user: {
          deletedAt: null,
          status: 'ACTIVE',
        },
      },
      select: { userId: true },
    }),
    prisma.parent.findMany({
      where: {
        schoolId: normalizedTrigger.schoolId,
        deletedAt: null,
        status: 'ACTIVE',
        user: {
          deletedAt: null,
          status: 'ACTIVE',
        },
      },
      select: { userId: true },
    }),
    prisma.attendance.findMany({
      where: {
        schoolId: normalizedTrigger.schoolId,
        date: localDate,
      },
      select: {
        userId: true,
        checkInTime: true,
        checkOutTime: true,
      },
    }),
  ]);

  const dayType = calendar?.dayType || 'WORKING_DAY';
  if (dayType !== 'WORKING_DAY') {
      console.log('[attendance/worker] reminder-skip-non-working-day', {
      schoolId: normalizedTrigger.schoolId,
      dayType,
      holidayName: calendar?.holidayName,
      localDateKey,
    });
    return {
      schoolId: normalizedTrigger.schoolId,
      dayType,
      skippedSchool: true,
      plans: [],
    };
  }

  const checkedInUsers = new Set(attendanceToday.filter((item) => item.checkInTime).map((item) => item.userId));
  const checkedOutUsers = new Set(attendanceToday.filter((item) => item.checkOutTime).map((item) => item.userId));
  const teacherIds = teachers.map((teacher) => teacher.userId);
  const parentIds = parents.map((parent) => parent.userId);
  const teachersNotCheckedIn = teacherIds.filter((userId) => !checkedInUsers.has(userId));
  const teachersNotCheckedOut = teacherIds.filter((userId) => checkedInUsers.has(userId) && !checkedOutUsers.has(userId));

  const planContext = {
    teachersNotCheckedIn,
    teachersNotCheckedOut,
    parents: parentIds,
  };

  const teacherPlans = normalizedTrigger.sendDailyReminders ? getTeacherPlans({
    ...normalizedTrigger,
    closingReminderTime: minutesToTimeString(normalizedTrigger.teacherClosingReminderMinute),
  }) : [];

  const parentPlans = normalizedTrigger.notifyParents ? getParentPlans({
    ...normalizedTrigger,
    parentStartReminderTime: minutesToTimeString(normalizedTrigger.parentStartReminderMinute),
  }) : [];

  const plans = [...teacherPlans, ...parentPlans];
  const results = [];

  for (const plan of plans) {
    const candidateUserIds = planContext[plan.candidateGroup] || [];
    const skippedAlreadyActed = plan.candidateGroup === 'teachersNotCheckedIn'
      ? teacherIds.filter((userId) => checkedInUsers.has(userId))
      : plan.candidateGroup === 'teachersNotCheckedOut'
        ? teacherIds.filter((userId) => checkedOutUsers.has(userId))
        : [];

    results.push(await sendReminderPlan({
      schoolId: normalizedTrigger.schoolId,
      timezone,
      localDateKey,
      userIds: candidateUserIds,
      skippedAlreadyActed,
      plan,
      now,
    }));
  }

  return {
    schoolId: normalizedTrigger.schoolId,
    dayType,
    skippedSchool: false,
    plans: results,
  };
}

function minutesToTimeString(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    return null;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export async function processScheduledAttendanceNotifications({
  now = new Date(),
  windowMinutes = DEFAULT_TRIGGER_WINDOW_MINUTES,
} = {}) {
  const effectiveNow = now instanceof Date ? now : new Date(now);
  const triggers = await findRelevantSchoolsForAttendanceNotifications(effectiveNow, windowMinutes);

  const stats = {
    now: effectiveNow.toISOString(),
    matchedSchools: triggers.length,
    processedSchools: 0,
    skippedSchools: 0,
    notificationsAttempted: 0,
    notificationsSent: 0,
    plans: [],
  };

  const batches = chunk(triggers, 10);
  for (const batch of batches) {
    const results = await Promise.all(batch.map((trigger) => processSchoolReminderTriggers(trigger, effectiveNow)));
    for (const result of results) {
      if (result.skippedSchool) {
        stats.skippedSchools += 1;
        continue;
      }

      stats.processedSchools += 1;
      result.plans.forEach((plan) => {
        stats.notificationsAttempted += plan.attempted;
        stats.notificationsSent += plan.notified;
        stats.plans.push({
          schoolId: result.schoolId,
          ruleType: plan.ruleType,
          attempted: plan.attempted,
          notified: plan.notified,
          skippedAlreadyActed: plan.skippedAlreadyActed.length,
          skippedAlreadySent: plan.skippedAlreadySent.length,
        });
      });
    }
  }

  console.log('[attendance/worker] scheduled-reminders-summary', stats);
  return stats;
}
