import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_SCHOOL_TIMEZONE = 'Asia/Kolkata';

export function getSchoolTimezone(school) {
  const candidate = school?.websiteConfig?.timezone
    || school?.websiteConfig?.timeZone
    || school?.timezone
    || DEFAULT_SCHOOL_TIMEZONE;

  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : DEFAULT_SCHOOL_TIMEZONE;
}

export function getZonedNow(timezoneName = DEFAULT_SCHOOL_TIMEZONE, input = new Date()) {
  return dayjs(input).tz(timezoneName);
}

export function getZonedDateStart(input = new Date(), timezoneName = DEFAULT_SCHOOL_TIMEZONE) {
  return dayjs(input).tz(timezoneName).startOf('day');
}

export function getDateKey(input = new Date(), timezoneName = DEFAULT_SCHOOL_TIMEZONE) {
  return dayjs(input).tz(timezoneName).format('YYYY-MM-DD');
}

export function zonedDateToDbDate(input = new Date(), timezoneName = DEFAULT_SCHOOL_TIMEZONE) {
  return getZonedDateStart(input, timezoneName).utc().toDate();
}

export function parseZonedDateTime(dateInput, timeString, timezoneName = DEFAULT_SCHOOL_TIMEZONE) {
  const datePart = typeof dateInput === 'string'
    ? dateInput
    : getDateKey(dateInput, timezoneName);

  return dayjs.tz(`${datePart} ${timeString}`, 'YYYY-MM-DD HH:mm', timezoneName);
}

export function zonedDayDiff(fromDate, toDate, timezoneName = DEFAULT_SCHOOL_TIMEZONE) {
  const from = getZonedDateStart(fromDate, timezoneName);
  const to = getZonedDateStart(toDate, timezoneName);
  return to.diff(from, 'day');
}
