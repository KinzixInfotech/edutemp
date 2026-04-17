import {
  DEFAULT_SCHOOL_TIMEZONE,
  getDateKey,
  getSchoolTimezone,
  getZonedNow,
  parseZonedDateTime,
  zonedDateToDbDate,
  zonedDayDiff,
} from './timezone.js';

export const AUTO_CHECKOUT_WARNING_MINUTES = 15;

export function getISTDate(value = new Date()) {
  return zonedDateToDbDate(value, DEFAULT_SCHOOL_TIMEZONE);
}

export function getISTNow(value = new Date()) {
  return getZonedNow(DEFAULT_SCHOOL_TIMEZONE, value).toDate();
}

export function parseTimeOnDate(baseDate, timeString, timezoneName = DEFAULT_SCHOOL_TIMEZONE) {
  return parseZonedDateTime(baseDate, timeString, timezoneName).toDate();
}

export function getAttendanceConfigSnapshot(config) {
  if (!config) {
    throw new Error('Attendance config not found');
  }

  const lateGraceMinutes = config.lateGraceMinutes ?? config.gracePeriodMinutes;
  const minHalfDayHours = config.minHalfDayHours ?? config.halfDayHours;
  const minFullDayHours = config.minFullDayHours ?? config.fullDayHours;
  const approvalAfterDays = config.approvalAfterDays ?? config.requireApprovalDays;
  const attendanceThreshold = config.attendanceThreshold ?? config.minAttendancePercent;
  const allowedRadius = config.allowedRadius ?? config.allowedRadiusMeters;
  const checkInWindowHours = config.checkInWindowHours ?? null;
  const checkOutGraceHours = config.checkOutGraceHours ?? null;
  const autoCheckoutBufferMinutes = config.autoCheckoutBufferMinutes
    ?? (checkOutGraceHours != null ? checkOutGraceHours * 60 : 60);
  const maxExtensionHours = config.maxExtensionHours ?? 4;
  const timezone = config.timezone ?? config.schoolTimezone ?? getSchoolTimezone(config.school);

  return {
    defaultStartTime: config.defaultStartTime,
    defaultEndTime: config.defaultEndTime,
    lateGraceMinutes,
    minHalfDayHours,
    minFullDayHours,
    approvalAfterDays,
    autoApproveLeaves: Boolean(config.autoApproveLeaves),
    attendanceThreshold,
    enableGeoFencing: Boolean(config.enableGeoFencing),
    schoolLatitude: config.schoolLatitude,
    schoolLongitude: config.schoolLongitude,
    allowedRadius,
    checkInWindowHours,
    checkOutGraceHours,
    autoCheckoutBufferMinutes,
    maxExtensionHours,
    timezone,
  };
}

export function computeAttendanceWindows(config, baseDate, overrides = {}) {
  const snapshot = getAttendanceConfigSnapshot(config);
  const effectiveStartTime = overrides.defaultStartTime ?? snapshot.defaultStartTime;
  const effectiveEndTime = overrides.defaultEndTime ?? snapshot.defaultEndTime;
  const effectiveCheckInWindowHours = overrides.checkInWindowHours ?? snapshot.checkInWindowHours;
  const effectiveAutoCheckoutBufferMinutes = overrides.autoCheckoutBufferMinutes ?? snapshot.autoCheckoutBufferMinutes;
  const effectiveMaxExtensionHours = overrides.maxExtensionHours ?? snapshot.maxExtensionHours;

  const checkInStart = parseTimeOnDate(baseDate, effectiveStartTime, snapshot.timezone);
  const lateAfter = new Date(checkInStart.getTime() + snapshot.lateGraceMinutes * 60 * 1000);
  const checkInEnd = effectiveCheckInWindowHours != null
    ? new Date(checkInStart.getTime() + effectiveCheckInWindowHours * 60 * 60 * 1000)
    : lateAfter;

  const checkOutDeadline = parseTimeOnDate(baseDate, effectiveEndTime, snapshot.timezone);
  const checkOutStart = new Date(checkInStart);
  const autoCheckoutCutoff = new Date(checkOutDeadline.getTime() + effectiveAutoCheckoutBufferMinutes * 60 * 1000);
  const checkOutEnd = autoCheckoutCutoff;
  const maxExtendedCheckoutEnd = new Date(checkOutDeadline.getTime() + effectiveMaxExtensionHours * 60 * 60 * 1000);
  const autoCheckoutReminderAt = new Date(autoCheckoutCutoff.getTime() - AUTO_CHECKOUT_WARNING_MINUTES * 60 * 1000);

  return {
    ...snapshot,
    defaultStartTime: effectiveStartTime,
    defaultEndTime: effectiveEndTime,
    autoCheckoutBufferMinutes: effectiveAutoCheckoutBufferMinutes,
    maxExtensionHours: effectiveMaxExtensionHours,
    checkInStart,
    lateAfter,
    checkInEnd,
    checkOutStart,
    checkOutDeadline,
    checkOutEnd,
    autoCheckoutCutoff,
    autoCheckoutReminderAt,
    maxExtendedCheckoutEnd,
  };
}

export function getCheckInStatus(now, lateAfter) {
  return now <= lateAfter ? 'PRESENT' : 'LATE';
}

export function getCheckoutAttendanceStatus(workingHours, config) {
  const snapshot = getAttendanceConfigSnapshot(config);

  if (workingHours < snapshot.minHalfDayHours) {
    return 'ABSENT';
  }
  if (workingHours < snapshot.minFullDayHours) {
    return 'HALF_DAY';
  }
  return 'PRESENT';
}

export function calculateWorkingHours(checkInTime, checkOutTime) {
  if (!checkInTime || !checkOutTime) {
    return 0;
  }

  return Number(((new Date(checkOutTime) - new Date(checkInTime)) / (1000 * 60 * 60)).toFixed(2));
}

export function calculateOvertimeHours(workingHours, standardWorkingHours) {
  if (!Number.isFinite(workingHours) || !Number.isFinite(standardWorkingHours)) {
    return 0;
  }

  if (workingHours <= standardWorkingHours) {
    return 0;
  }

  return Number((workingHours - standardWorkingHours).toFixed(2));
}

export function getOvertimeState({
  workingHours,
  standardWorkingHours,
  overtimeEnabled = true,
  overtimeRequiresApproval = true,
}) {
  const overtimeHours = overtimeEnabled
    ? calculateOvertimeHours(workingHours, standardWorkingHours)
    : 0;

  if (overtimeHours <= 0) {
    return {
      overtimeHours: 0,
      overtimeStatus: 'NOT_REQUIRED',
    };
  }

  return {
    overtimeHours,
    overtimeStatus: overtimeRequiresApproval ? 'PENDING' : 'APPROVED',
  };
}

export function resolveAttendanceCheckoutDeadline(attendance, windows) {
  if (!attendance?.isExtended || !attendance?.extendedTill) {
    return windows.autoCheckoutCutoff;
  }

  const extendedTill = new Date(attendance.extendedTill);
  return extendedTill <= windows.maxExtendedCheckoutEnd
    ? extendedTill
    : windows.maxExtendedCheckoutEnd;
}

export function canRequestExtension(now, windows) {
  return now > windows.checkOutDeadline && now <= windows.maxExtendedCheckoutEnd;
}

export function normalizeExtendedTill(extendedTill, windows) {
  if (!extendedTill) {
    return null;
  }

  const parsed = new Date(extendedTill);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (parsed <= windows.checkOutDeadline) {
    return null;
  }

  if (parsed > windows.maxExtendedCheckoutEnd) {
    return null;
  }

  return parsed;
}

export function requiresApprovalForDate(targetDate, approvalAfterDays, referenceDate = new Date(), timezoneName = DEFAULT_SCHOOL_TIMEZONE) {
  if (approvalAfterDays == null || approvalAfterDays < 0) {
    return false;
  }

  return zonedDayDiff(targetDate, referenceDate, timezoneName) > approvalAfterDays;
}

export function getDbDateForConfig(config, input = new Date()) {
  const snapshot = getAttendanceConfigSnapshot(config);
  return zonedDateToDbDate(input, snapshot.timezone);
}

export function getDateKeyForConfig(config, input = new Date()) {
  const snapshot = getAttendanceConfigSnapshot(config);
  return getDateKey(input, snapshot.timezone);
}
