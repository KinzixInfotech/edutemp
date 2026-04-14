import {
  DEFAULT_SCHOOL_TIMEZONE,
  getDateKey,
  getSchoolTimezone,
  getZonedNow,
  parseZonedDateTime,
  zonedDateToDbDate,
  zonedDayDiff,
} from './timezone.js';

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
    timezone,
  };
}

export function computeAttendanceWindows(config, baseDate, overrides = {}) {
  const snapshot = getAttendanceConfigSnapshot(config);
  const effectiveStartTime = overrides.defaultStartTime ?? snapshot.defaultStartTime;
  const effectiveEndTime = overrides.defaultEndTime ?? snapshot.defaultEndTime;
  const effectiveCheckInWindowHours = overrides.checkInWindowHours ?? snapshot.checkInWindowHours;
  const effectiveCheckOutGraceHours = overrides.checkOutGraceHours ?? snapshot.checkOutGraceHours;

  const checkInStart = parseTimeOnDate(baseDate, effectiveStartTime, snapshot.timezone);
  const lateAfter = new Date(checkInStart.getTime() + snapshot.lateGraceMinutes * 60 * 1000);
  const checkInEnd = effectiveCheckInWindowHours != null
    ? new Date(checkInStart.getTime() + effectiveCheckInWindowHours * 60 * 60 * 1000)
    : lateAfter;

  const checkOutDeadline = parseTimeOnDate(baseDate, effectiveEndTime, snapshot.timezone);
  const checkOutStart = new Date(checkInStart);
  const checkOutEnd = effectiveCheckOutGraceHours != null
    ? new Date(checkOutDeadline.getTime() + effectiveCheckOutGraceHours * 60 * 60 * 1000)
    : checkOutDeadline;

  return {
    ...snapshot,
    defaultStartTime: effectiveStartTime,
    defaultEndTime: effectiveEndTime,
    checkInStart,
    lateAfter,
    checkInEnd,
    checkOutStart,
    checkOutDeadline,
    checkOutEnd,
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
