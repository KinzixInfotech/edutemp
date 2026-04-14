import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeAttendanceWindows,
  getCheckInStatus,
  getCheckoutAttendanceStatus,
  requiresApprovalForDate,
} from './config.js';

const sampleConfig = {
  defaultStartTime: '09:00',
  defaultEndTime: '14:00',
  gracePeriodMinutes: 15,
  halfDayHours: 4,
  fullDayHours: 8,
  requireApprovalDays: 3,
  autoApproveLeaves: true,
  minAttendancePercent: 75,
  enableGeoFencing: true,
  schoolLatitude: 23.5,
  schoolLongitude: 87.3,
  allowedRadiusMeters: 250,
};

test('strict check-in window ends at grace cutoff when no window hours are configured', () => {
  const baseDate = new Date('2026-04-14T00:00:00.000Z');
  const windows = computeAttendanceWindows(sampleConfig, baseDate);

  assert.equal(windows.checkInStart.getHours(), 9);
  assert.equal(windows.checkInStart.getMinutes(), 0);
  assert.equal(windows.lateAfter.getHours(), 9);
  assert.equal(windows.lateAfter.getMinutes(), 15);
  assert.equal(windows.checkInEnd.getTime(), windows.lateAfter.getTime());
  assert.equal(windows.checkOutDeadline.getHours(), 14);
  assert.equal(windows.checkOutDeadline.getMinutes(), 0);
  assert.equal(windows.checkOutEnd.getTime(), windows.checkOutDeadline.getTime());
});

test('on-time and late check-in statuses use grace cutoff', () => {
  const baseDate = new Date('2026-04-14T00:00:00.000Z');
  const windows = computeAttendanceWindows(sampleConfig, baseDate);
  const onTime = new Date(windows.checkInStart.getTime() + 10 * 60 * 1000);
  const late = new Date(windows.lateAfter.getTime() + 60 * 1000);

  assert.equal(getCheckInStatus(onTime, windows.lateAfter), 'PRESENT');
  assert.equal(getCheckInStatus(late, windows.lateAfter), 'LATE');
});

test('checkout status uses configured half-day and full-day thresholds', () => {
  assert.equal(getCheckoutAttendanceStatus(3.5, sampleConfig), 'ABSENT');
  assert.equal(getCheckoutAttendanceStatus(4.5, sampleConfig), 'HALF_DAY');
  assert.equal(getCheckoutAttendanceStatus(8, sampleConfig), 'PRESENT');
});

test('backdated approval respects configured threshold days', () => {
  const today = new Date('2026-04-14T10:00:00.000Z');

  assert.equal(requiresApprovalForDate(new Date('2026-04-12T00:00:00.000Z'), 3, today), false);
  assert.equal(requiresApprovalForDate(new Date('2026-04-10T00:00:00.000Z'), 3, today), true);
});
