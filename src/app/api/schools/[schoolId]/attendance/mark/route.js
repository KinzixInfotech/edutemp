import { withSchoolAccess } from "@/lib/api-auth";
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';
import qstash from '@/lib/qstash';
import {
  calculateWorkingHours,
  canRequestExtension,
  computeAttendanceWindows,
  getAttendanceConfigSnapshot,
  getCheckInStatus,
  getCheckoutAttendanceStatus,
  getOvertimeState,
  getDateKeyForConfig,
  getDbDateForConfig,
  normalizeExtendedTill,
  requiresApprovalForDate,
  resolveAttendanceCheckoutDeadline } from
'@/lib/attendance/config';
import { getSchoolTimezone, getZonedNow } from '@/lib/attendance/timezone';
import { getTeacherShiftAttendanceWindow } from '@/lib/attendance/shifts';
import { getLocationSecuritySignals } from '@/lib/attendance/security';
import { createAttendanceAuditLog } from '@/lib/attendance/audit';
import { getPayrollConfigForSchool } from '@/lib/payroll/config';

function logAttendanceDebug(stage, payload) {
  console.log(`[attendance/mark] ${stage}`, payload);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a =
  Math.sin(Δφ / 2) ** 2 +
  Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function enqueueAttendancePostProcessing(payload) {
  const base = process.env.APP_URL || 'https://www.edubreezy.com';
  const workerUrl = `${base}/api/workers/attendance`;
  const isDev = process.env.NODE_ENV === 'development';

  try {
    if (isDev) {
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY || 'edubreezy_internal'
        },
        body: JSON.stringify(payload)
      }).catch((error) => console.error('[attendance/mark] worker kick failed', error));
      return;
    }

    await qstash.publishJSON({
      url: workerUrl,
      body: payload,
      retries: 3
    });
  } catch (error) {
    console.error('[attendance/mark] failed to enqueue worker', error);
  }
}export const POST = withSchoolAccess(async function POST(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const body = await req.json();
  const {
    userId,
    type,
    location,
    deviceInfo,
    remarks,
    capturedAt,
    submissionMode = 'LIVE',
    queueId
  } = body;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
  req.headers.get('x-real-ip') ||
  'Unknown';
  const enrichedDeviceInfo = {
    ...deviceInfo,
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || deviceInfo?.userAgent,
    submissionMode,
    queueId: queueId || null
  };

  if (!userId || !type || !['CHECK_IN', 'CHECK_OUT', 'EXTEND'].includes(type)) {
    return NextResponse.json({
      error: 'userId and valid type (CHECK_IN/CHECK_OUT/EXTEND) required'
    }, { status: 400 });
  }

  try {
    const serverNow = new Date();
    const [config, school, activeAcademicYear, recentAttendance, payrollConfig] = await Promise.all([
    prisma.attendanceConfig.findUnique({ where: { schoolId } }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, websiteConfig: true }
    }),
    prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true }
    }),
    prisma.attendance.findFirst({
      where: { userId, schoolId },
      orderBy: [{ date: 'desc' }, { markedAt: 'desc' }],
      select: {
        id: true,
        date: true,
        deviceInfo: true,
        checkInLocation: true,
        checkOutLocation: true
      }
    }),
    getPayrollConfigForSchool(schoolId)]
    );

    if (!config) {
      return NextResponse.json({
        error: 'Attendance config not found. Please set up attendance settings first.'
      }, { status: 404 });
    }

    const timezone = getSchoolTimezone(school);
    const configWithTimezone = {
      ...config,
      school,
      timezone
    };

    const effectiveEventTime = submissionMode === 'OFFLINE_SYNC' && capturedAt ?
    new Date(capturedAt) :
    serverNow;
    const today = getDbDateForConfig(configWithTimezone, effectiveEventTime);
    const dateKey = getDateKeyForConfig(configWithTimezone, effectiveEventTime);
    const shiftWindow = await getTeacherShiftAttendanceWindow({
      schoolId,
      userId,
      targetDate: effectiveEventTime,
      timezone
    });
    const windows = computeAttendanceWindows(configWithTimezone, dateKey, shiftWindow || {});
    const configSnapshot = getAttendanceConfigSnapshot(configWithTimezone);

    const [calendar, lock] = await Promise.all([
    prisma.schoolCalendar.findUnique({
      where: { schoolId_date: { schoolId, date: today } }
    }),
    prisma.attendanceLock.findUnique({
      where: {
        schoolId_month_year: {
          schoolId,
          month: getZonedNow(timezone, effectiveEventTime).month() + 1,
          year: getZonedNow(timezone, effectiveEventTime).year()
        }
      }
    })]
    );

    logAttendanceDebug('loaded-config', {
      schoolId,
      userId,
      type,
      timezone,
      submissionMode,
      config: configSnapshot,
      shiftWindow
    });
    logAttendanceDebug('computed-windows', {
      checkInStart: windows.checkInStart.toISOString(),
      checkInEnd: windows.checkInEnd.toISOString(),
      lateAfter: windows.lateAfter.toISOString(),
      checkOutDeadline: windows.checkOutDeadline.toISOString(),
      checkOutEnd: windows.checkOutEnd.toISOString(),
      autoCheckoutCutoff: windows.autoCheckoutCutoff.toISOString(),
      maxExtendedCheckoutEnd: windows.maxExtendedCheckoutEnd.toISOString()
    });

    const effectiveDayType = calendar?.dayType || 'WORKING_DAY';
    if (effectiveDayType !== 'WORKING_DAY') {
      await createAttendanceAuditLog({
        userId,
        schoolId,
        action: `${type}_BLOCKED_NON_WORKING_DAY`,
        payload: { dayType: effectiveDayType, date: dateKey, submissionMode }
      });
      return NextResponse.json({
        error: `Selected date is ${effectiveDayType}. No attendance required.`,
        dayType: effectiveDayType,
        holidayName: calendar?.holidayName
      }, { status: 400 });
    }

    if (lock?.isLocked) {
      await createAttendanceAuditLog({
        userId,
        schoolId,
        action: `${type}_BLOCKED_LOCKED_PERIOD`,
        payload: { date: dateKey, month: lock.month, year: lock.year, submissionMode }
      });
      return NextResponse.json({
        error: 'Attendance for this period is locked. Contact admin for manual override.'
      }, { status: 423 });
    }

    let distance = null;
    if (type !== 'EXTEND' && configSnapshot.enableGeoFencing) {
      if (!location?.latitude || !location?.longitude) {
        await createAttendanceAuditLog({
          userId,
          schoolId,
          action: `${type}_BLOCKED_NO_LOCATION`,
          payload: { date: dateKey, submissionMode }
        });
        return NextResponse.json({
          error: 'Location is required for attendance marking.'
        }, { status: 400 });
      }

      if (!configSnapshot.schoolLatitude || !configSnapshot.schoolLongitude) {
        return NextResponse.json({
          error: 'School location not configured'
        }, { status: 400 });
      }

      distance = calculateDistance(
        location.latitude,
        location.longitude,
        configSnapshot.schoolLatitude,
        configSnapshot.schoolLongitude
      );

      logAttendanceDebug('geo-distance', {
        schoolId,
        userId,
        type,
        distance: Math.round(distance),
        allowedRadius: configSnapshot.allowedRadius
      });

      if (distance > configSnapshot.allowedRadius) {
        await createAttendanceAuditLog({
          userId,
          schoolId,
          action: `${type}_BLOCKED_OUTSIDE_GEOFENCE`,
          payload: {
            date: dateKey,
            submissionMode,
            distance: Math.round(distance),
            allowedRadius: configSnapshot.allowedRadius,
            location
          },
          error: 'OUTSIDE_GEOFENCE'
        });

        return NextResponse.json({
          error: `You are ${Math.round(distance)}m away from school. You must be within ${configSnapshot.allowedRadius}m to mark attendance.`
        }, { status: 403 });
      }
    }

    const securityAssessment = getLocationSecuritySignals({
      currentLocation: {
        ...location,
        capturedAt: capturedAt || effectiveEventTime.toISOString()
      },
      previousLocation: recentAttendance?.checkOutLocation || recentAttendance?.checkInLocation,
      allowedRadius: configSnapshot.allowedRadius,
      distanceFromSchool: distance,
      eventTime: effectiveEventTime,
      serverTime: serverNow,
      priorDeviceId: recentAttendance?.deviceInfo?.installationId || recentAttendance?.deviceInfo?.deviceId,
      currentDeviceId: enrichedDeviceInfo.installationId || enrichedDeviceInfo.deviceId
    });

    if (securityAssessment.blockingSignals.length > 0) {
      await createAttendanceAuditLog({
        userId,
        schoolId,
        action: `${type}_BLOCKED_SECURITY`,
        payload: {
          date: dateKey,
          submissionMode,
          securityAssessment,
          location,
          deviceInfo: enrichedDeviceInfo
        },
        error: securityAssessment.blockingSignals.join(',')
      });

      const primaryReason = securityAssessment.blockingSignals.includes('MOCK_LOCATION') ?
      'Mock location detected. Attendance cannot be marked.' :
      `You are ${Math.round(distance || 0)}m away. Must be within ${configSnapshot.allowedRadius}m of school.`;

      return NextResponse.json({
        error: primaryReason,
        securityAssessment
      }, { status: 400 });
    }

    const existing = await prisma.attendance.findUnique({
      where: { userId_schoolId_date: { userId, schoolId, date: today } }
    });

    const needsApproval = requiresApprovalForDate(today, configSnapshot.approvalAfterDays, serverNow, timezone) ||
    submissionMode === 'OFFLINE_SYNC' ||
    securityAssessment.suspiciousSignals.length > 0;

    const baseAttendanceData = {
      remarks,
      deviceInfo: {
        ...enrichedDeviceInfo,
        securityAssessment
      },
      requiresApproval: needsApproval,
      approvalStatus: needsApproval ? 'PENDING' : 'NOT_REQUIRED',
      markedBy: userId
    };

    if (type === 'CHECK_IN') {
      if (existing?.checkInTime) {
        await createAttendanceAuditLog({
          userId,
          schoolId,
          attendanceId: existing.id,
          action: 'CHECK_IN_DUPLICATE',
          payload: { date: dateKey, submissionMode, existingCheckInTime: existing.checkInTime },
          error: 'Already checked in'
        });
        return NextResponse.json({
          success: false,
          message: 'Already checked in today',
          attendance: existing
        });
      }

      if (effectiveEventTime < windows.checkInStart || effectiveEventTime > windows.checkInEnd) {
        await createAttendanceAuditLog({
          userId,
          schoolId,
          action: 'CHECK_IN_WINDOW_BLOCK',
          payload: {
            date: dateKey,
            submissionMode,
            eventTime: effectiveEventTime.toISOString(),
            start: windows.checkInStart.toISOString(),
            end: windows.checkInEnd.toISOString()
          },
          error: 'Outside check-in window'
        });
        return NextResponse.json({
          success: false,
          message: effectiveEventTime < windows.checkInStart ?
          `Check-in opens at ${configSnapshot.defaultStartTime}` :
          `Check-in window closed at ${windows.checkInEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
          securityAssessment
        });
      }

      const status = getCheckInStatus(effectiveEventTime, windows.lateAfter);
      const isLate = status === 'LATE';
      const lateByMinutes = isLate ? Math.floor((effectiveEventTime - windows.lateAfter) / 60000) : null;

      const attendance = existing ?
      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          ...baseAttendanceData,
          status,
          checkInTime: effectiveEventTime,
          checkInLocation: location || null,
          isLateCheckIn: isLate,
          lateByMinutes,
          workingHours: 0,
          overtimeHours: 0,
          overtimeStatus: 'NOT_REQUIRED',
          overtimeApprovedBy: null,
          overtimeApprovedAt: null,
          overtimeApprovalRemarks: null,
          checkoutType: 'MANUAL',
          isExtended: false,
          extendedTill: null,
          extensionRequestedAt: null
        }
      }) :
      await prisma.attendance.create({
        data: {
          userId,
          schoolId,
          date: today,
          academicYearId: activeAcademicYear?.id || null,
          ...baseAttendanceData,
          status,
          checkInTime: effectiveEventTime,
          checkInLocation: location || null,
          isLateCheckIn: isLate,
          lateByMinutes,
          workingHours: 0,
          overtimeHours: 0,
          overtimeStatus: 'NOT_REQUIRED',
          checkoutType: 'MANUAL',
          isExtended: false
        }
      });

      await createAttendanceAuditLog({
        userId,
        schoolId,
        attendanceId: attendance.id,
        action: 'CHECK_IN',
        payload: {
          date: dateKey,
          submissionMode,
          status,
          location,
          deviceInfo: enrichedDeviceInfo,
          securityAssessment,
          shiftWindow
        }
      });

      await enqueueAttendancePostProcessing({
        schoolId,
        attendanceId: attendance.id,
        userId,
        action: 'CHECK_IN',
        securityAssessment
      });

      await invalidatePattern(`attendance:${schoolId}*`);

      return NextResponse.json({
        success: true,
        message: isLate ?
        `Checked in (Late by ${lateByMinutes} min)` :
        'Checked in successfully',
        attendance,
        isLate,
        lateByMinutes,
        securityAssessment,
        timezone,
        shiftWindow,
        checkOutWindow: {
          start: windows.checkOutStart.toISOString(),
          deadline: windows.checkOutDeadline.toISOString(),
          autoCutoff: windows.autoCheckoutCutoff.toISOString(),
          end: windows.autoCheckoutCutoff.toISOString(),
          maxExtendedEnd: windows.maxExtendedCheckoutEnd.toISOString()
        }
      });
    }

    if (!existing?.checkInTime) {
      await createAttendanceAuditLog({
        userId,
        schoolId,
        action: type === 'EXTEND' ? 'EXTEND_WITHOUT_CHECK_IN' : 'CHECK_OUT_WITHOUT_CHECK_IN',
        payload: { date: dateKey, submissionMode },
        error: 'No check-in record found'
      });
      return NextResponse.json({
        success: false,
        message: 'No check-in record found for selected date'
      });
    }

    if (existing.checkOutTime) {
      await createAttendanceAuditLog({
        userId,
        schoolId,
        attendanceId: existing.id,
        action: type === 'EXTEND' ? 'EXTEND_DUPLICATE' : 'CHECK_OUT_DUPLICATE',
        payload: { date: dateKey, submissionMode, existingCheckOutTime: existing.checkOutTime },
        error: 'Already checked out'
      });
      return NextResponse.json({
        success: false,
        message: 'Already checked out today',
        attendance: existing
      });
    }

    if (type === 'EXTEND') {
      if (existing.isExtended && existing.extendedTill) {
        return NextResponse.json({
          success: false,
          message: 'Extension has already been recorded for today.',
          attendance: existing
        }, { status: 400 });
      }

      if (!canRequestExtension(effectiveEventTime, windows)) {
        return NextResponse.json({
          success: false,
          message: 'Extension can only be requested after school end time and before the maximum extension cutoff.'
        }, { status: 400 });
      }

      const requestedExtendedTill = normalizeExtendedTill(body.extendedTill, windows);
      if (!requestedExtendedTill) {
        return NextResponse.json({
          success: false,
          message: `Extension time must be after ${configSnapshot.defaultEndTime} and within ${windows.maxExtensionHours} hours of school end.`
        }, { status: 400 });
      }

      const attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          ...baseAttendanceData,
          isExtended: true,
          extendedTill: requestedExtendedTill,
          extensionRequestedAt: serverNow,
          remarks: remarks || existing.remarks
        }
      });

      await createAttendanceAuditLog({
        userId,
        schoolId,
        attendanceId: attendance.id,
        action: 'EXTEND_WORKDAY',
        payload: {
          date: dateKey,
          submissionMode,
          extendedTill: requestedExtendedTill.toISOString(),
          maxExtendedCheckoutEnd: windows.maxExtendedCheckoutEnd.toISOString(),
          shiftWindow
        }
      });

      await invalidatePattern(`attendance:${schoolId}*`);

      return NextResponse.json({
        success: true,
        message: `Workday extended until ${requestedExtendedTill.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        attendance,
        timezone,
        checkOutWindow: {
          deadline: windows.checkOutDeadline.toISOString(),
          autoCutoff: windows.autoCheckoutCutoff.toISOString(),
          effectiveCutoff: requestedExtendedTill.toISOString(),
          maxExtendedEnd: windows.maxExtendedCheckoutEnd.toISOString()
        }
      });
    }

    if (effectiveEventTime < new Date(existing.checkInTime)) {
      return NextResponse.json({
        success: false,
        message: 'Check-out time cannot be earlier than check-in time'
      }, { status: 400 });
    }

    const effectiveCheckoutDeadline = resolveAttendanceCheckoutDeadline(existing, windows);
    if (effectiveEventTime > effectiveCheckoutDeadline) {
      await createAttendanceAuditLog({
        userId,
        schoolId,
        attendanceId: existing.id,
        action: 'CHECK_OUT_WINDOW_BLOCK',
        payload: {
          date: dateKey,
          submissionMode,
          eventTime: effectiveEventTime.toISOString(),
          effectiveCheckoutDeadline: effectiveCheckoutDeadline.toISOString()
        },
        error: 'Outside check-out window'
      });
      return NextResponse.json({
        success: false,
        message: `Check-out window closed at ${effectiveCheckoutDeadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`
      });
    }

    const workingHours = calculateWorkingHours(existing.checkInTime, effectiveEventTime);
    const rawStatus = getCheckoutAttendanceStatus(workingHours, configWithTimezone);
    const normalizedStatus = existing.status === 'LATE' && rawStatus === 'PRESENT' ? 'LATE' : rawStatus;
    const overtimeState = getOvertimeState({
      workingHours,
      standardWorkingHours: payrollConfig.standardWorkingHours,
      overtimeEnabled: payrollConfig.enableOvertime,
      overtimeRequiresApproval: payrollConfig.overtimeRequiresApproval
    });

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        ...baseAttendanceData,
        status: normalizedStatus,
        checkOutTime: effectiveEventTime,
        checkOutLocation: location || null,
        workingHours,
        overtimeHours: overtimeState.overtimeHours,
        overtimeStatus: overtimeState.overtimeStatus,
        overtimeApprovedBy: null,
        overtimeApprovedAt: overtimeState.overtimeStatus === 'APPROVED' ? serverNow : null,
        overtimeApprovalRemarks: null,
        checkoutType: 'MANUAL',
        remarks: remarks || existing.remarks
      }
    });

    await createAttendanceAuditLog({
      userId,
      schoolId,
      attendanceId: attendance.id,
      action: 'CHECK_OUT',
      payload: {
        date: dateKey,
        submissionMode,
        status: attendance.status,
        workingHours,
        overtimeHours: overtimeState.overtimeHours,
        overtimeStatus: overtimeState.overtimeStatus,
        location,
        deviceInfo: enrichedDeviceInfo,
        securityAssessment,
        shiftWindow
      }
    });

    await enqueueAttendancePostProcessing({
      schoolId,
      attendanceId: attendance.id,
      userId,
      action: 'CHECK_OUT',
      securityAssessment
    });

    await invalidatePattern(`attendance:${schoolId}*`);

    return NextResponse.json({
      success: true,
      message: `Checked out successfully. Worked ${workingHours.toFixed(2)} hours`,
      attendance,
      workingHours,
      overtimeHours: overtimeState.overtimeHours,
      overtimeStatus: overtimeState.overtimeStatus,
      attendanceStatus: attendance.status,
      securityAssessment,
      timezone,
      shiftWindow
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    await createAttendanceAuditLog({
      userId,
      schoolId,
      action: `${type}_ERROR`,
      payload: {
        submissionMode,
        queueId,
        capturedAt
      },
      error: error.message
    });
    return NextResponse.json({
      error: 'Server error',
      details: error.message
    }, { status: 500 });
  }
});

export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const userId = new URL(req.url).searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const [config, school, payrollConfig] = await Promise.all([
    prisma.attendanceConfig.findUnique({ where: { schoolId } }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, websiteConfig: true }
    }),
    getPayrollConfigForSchool(schoolId)]
    );

    if (!config) {
      return NextResponse.json({
        error: 'Attendance config not found. Please set up attendance settings first.',
        needsSetup: true
      }, { status: 404 });
    }

    const timezone = getSchoolTimezone(school);
    const configWithTimezone = { ...config, school, timezone };
    const now = new Date();
    const today = getDbDateForConfig(configWithTimezone, now);
    const dateKey = getDateKeyForConfig(configWithTimezone, now);
    const shiftWindow = await getTeacherShiftAttendanceWindow({
      schoolId,
      userId,
      targetDate: now,
      timezone
    });
    const computed = computeAttendanceWindows(configWithTimezone, dateKey, shiftWindow || {});
    const configSnapshot = getAttendanceConfigSnapshot(configWithTimezone);
    const zonedNow = getZonedNow(timezone, now);
    const month = zonedNow.month() + 1;
    const year = zonedNow.year();

    const [attendance, calendar, monthlyStats] = await Promise.all([
    prisma.attendance.findUnique({
      where: { userId_schoolId_date: { userId, schoolId, date: today } }
    }),
    prisma.schoolCalendar.findUnique({
      where: { schoolId_date: { schoolId, date: today } }
    }),
    getMonthlyStats(userId, schoolId, month, year)]
    );

    let liveWorkingHours = 0;
    if (attendance?.checkInTime && !attendance?.checkOutTime) {
      liveWorkingHours = calculateWorkingHours(attendance.checkInTime, now);
    }
    const effectiveCheckoutDeadline = attendance?.checkInTime && !attendance?.checkOutTime ?
    resolveAttendanceCheckoutDeadline(attendance, computed) :
    computed.autoCheckoutCutoff;

    const isWorkingDay = (calendar?.dayType || 'WORKING_DAY') === 'WORKING_DAY';

    return NextResponse.json({
      attendance: {
        ...attendance,
        workingHours: attendance?.checkOutTime ? attendance.workingHours ?? 0 : liveWorkingHours,
        liveWorkingHours: attendance?.checkOutTime ? null : liveWorkingHours
      },
      isWorkingDay,
      dayType: calendar?.dayType || 'WORKING_DAY',
      holidayName: calendar?.holidayName,
      shiftWindow,
      alerts: {
        attendanceBelowThreshold: monthlyStats.attendancePercentage < (configSnapshot.attendanceThreshold ?? 0)
      },
      config: {
        startTime: computed.defaultStartTime,
        endTime: computed.defaultEndTime,
        defaultStartTime: computed.defaultStartTime,
        defaultEndTime: computed.defaultEndTime,
        timezone,
        schoolTimezone: timezone,
        lateGraceMinutes: configSnapshot.lateGraceMinutes,
        gracePeriod: configSnapshot.lateGraceMinutes,
        enableGeoFencing: configSnapshot.enableGeoFencing,
        schoolLatitude: configSnapshot.schoolLatitude,
        schoolLongitude: configSnapshot.schoolLongitude,
        allowedRadius: configSnapshot.allowedRadius,
        allowedRadiusMeters: configSnapshot.allowedRadius,
        minHalfDayHours: configSnapshot.minHalfDayHours,
        minFullDayHours: configSnapshot.minFullDayHours,
        halfDayHours: configSnapshot.minHalfDayHours,
        fullDayHours: configSnapshot.minFullDayHours,
        autoCheckoutBufferMinutes: configSnapshot.autoCheckoutBufferMinutes,
        maxExtensionHours: configSnapshot.maxExtensionHours,
        checkInWindowHours: configSnapshot.checkInWindowHours,
        checkOutGraceHours: configSnapshot.checkOutGraceHours,
        approvalAfterDays: configSnapshot.approvalAfterDays,
        requireApprovalDays: configSnapshot.approvalAfterDays,
        autoApproveLeaves: configSnapshot.autoApproveLeaves,
        attendanceThreshold: configSnapshot.attendanceThreshold,
        minAttendancePercent: configSnapshot.attendanceThreshold,
        standardWorkingHours: payrollConfig.standardWorkingHours
      },
      windows: {
        checkIn: {
          start: computed.checkInStart.toISOString(),
          end: computed.checkInEnd.toISOString(),
          lateAfter: computed.lateAfter.toISOString(),
          isOpen: now >= computed.checkInStart && now <= computed.checkInEnd
        },
        checkOut: {
          start: computed.checkOutStart.toISOString(),
          end: effectiveCheckoutDeadline.toISOString(),
          deadline: computed.checkOutDeadline.toISOString(),
          autoCutoff: computed.autoCheckoutCutoff.toISOString(),
          maxExtendedEnd: computed.maxExtendedCheckoutEnd.toISOString(),
          effectiveCutoff: effectiveCheckoutDeadline.toISOString(),
          isOpen: !!attendance?.checkInTime && !attendance?.checkOutTime && now <= effectiveCheckoutDeadline
        }
      },
      monthlyStats
    });
  } catch (e) {
    console.error('GET error:', e);
    return NextResponse.json({
      error: 'Failed to fetch',
      details: e.message
    }, { status: 500 });
  }
});

async function getMonthlyStats(userId, schoolId, month, year) {
  let stats = await prisma.attendanceStats.findFirst({
    where: { userId, schoolId, month, year }
  });

  if (!stats) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    const [records, workingDays] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId, schoolId, date: { gte: startDate, lte: endDate } }
    }),
    prisma.schoolCalendar.count({
      where: {
        schoolId,
        date: { gte: startDate, lte: endDate },
        dayType: 'WORKING_DAY'
      }
    })]
    );

    const present = records.filter((r) => ['PRESENT', 'LATE'].includes(r.status)).length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const leaves = records.filter((r) => r.status === 'ON_LEAVE').length;

    const totalWorking = workingDays || records.length;
    const percentage = totalWorking > 0 ? (present / totalWorking * 100).toFixed(1) : 0;

    stats = {
      totalWorkingDays: totalWorking,
      totalPresent: present,
      totalAbsent: absent,
      totalLate: late,
      totalLeaves: leaves,
      attendancePercentage: parseFloat(percentage)
    };
  }

  return {
    totalDays: stats.totalWorkingDays,
    presentDays: stats.totalPresent,
    absentDays: stats.totalAbsent,
    lateDays: stats.totalLate,
    leaveDays: stats.totalLeaves,
    attendancePercentage: stats.attendancePercentage
  };
}