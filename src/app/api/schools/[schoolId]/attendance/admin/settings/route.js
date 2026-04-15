// app/api/schools/[schoolId]/attendance/admin/settings/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getAttendanceConfigSnapshot } from '@/lib/attendance/config';
import { getSchoolTimezone } from '@/lib/attendance/timezone';

// GET - Fetch current attendance config (auto-creates if not exists)
export async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  console.log('Attendance settings GET for schoolId:', schoolId);

  try {
    let config = await prisma.attendanceConfig.findUnique({
      where: { schoolId }
    });
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { websiteConfig: true }
    });

    // Auto-create config row so schema defaults are persisted as DB values.
    if (!config) {
      console.log('No attendance config found, creating config row for:', schoolId);
      config = await prisma.attendanceConfig.create({
        data: {
          school: { connect: { id: schoolId } },
        }
      });
      console.log('Attendance config row created from schema defaults');
    }

    const snapshot = getAttendanceConfigSnapshot({ ...config, school });

    return NextResponse.json({
      config: {
        defaultStartTime: snapshot.defaultStartTime,
        defaultEndTime: snapshot.defaultEndTime,
        timezone: snapshot.timezone,
        schoolTimezone: snapshot.timezone,
        parentNotifyBeforeMinutes: school?.websiteConfig?.parentNotifyBeforeMinutes ?? 30,
        lateGraceMinutes: snapshot.lateGraceMinutes,
        gracePeriodMinutes: snapshot.lateGraceMinutes,
        minHalfDayHours: snapshot.minHalfDayHours,
        minFullDayHours: snapshot.minFullDayHours,
        halfDayHours: snapshot.minHalfDayHours,
        fullDayHours: snapshot.minFullDayHours,

        enableGeoFencing: snapshot.enableGeoFencing,
        schoolLatitude: snapshot.schoolLatitude,
        schoolLongitude: snapshot.schoolLongitude,
        allowedRadius: snapshot.allowedRadius,
        allowedRadiusMeters: snapshot.allowedRadius,

        autoMarkAbsent: config.autoMarkAbsent,
        autoMarkTime: config.autoMarkTime,

        approvalAfterDays: snapshot.approvalAfterDays,
        requireApprovalDays: snapshot.approvalAfterDays,
        autoApproveLeaves: snapshot.autoApproveLeaves,

        sendDailyReminders: config.sendDailyReminders,
        reminderTime: config.reminderTime,
        notifyParents: config.notifyParents,

        enableBiometricAttendance: config.enableBiometricAttendance,

        calculateOnWeekends: config.calculateOnWeekends,
        attendanceThreshold: snapshot.attendanceThreshold,
        minAttendancePercent: snapshot.attendanceThreshold
      },
      isNewlyCreated: !config.createdAt || config.createdAt.getTime() === config.updatedAt.getTime()
    });

  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({
      error: 'Failed to fetch settings'
    }, { status: 500 });
  }
}

// PUT - Update attendance config
export async function PUT(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const updates = await req.json();

  try {
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (updates.defaultStartTime && !timeRegex.test(updates.defaultStartTime)) {
      return NextResponse.json({
        error: 'Invalid start time format. Use HH:MM'
      }, { status: 400 });
    }
    if (updates.defaultEndTime && !timeRegex.test(updates.defaultEndTime)) {
      return NextResponse.json({
        error: 'Invalid end time format. Use HH:MM'
      }, { status: 400 });
    }

    const normalizedUpdates = {
      defaultStartTime: updates.defaultStartTime,
      defaultEndTime: updates.defaultEndTime,
      gracePeriodMinutes: updates.lateGraceMinutes ?? updates.gracePeriodMinutes,
      halfDayHours: updates.minHalfDayHours ?? updates.halfDayHours,
      fullDayHours: updates.minFullDayHours ?? updates.fullDayHours,
      enableGeoFencing: updates.enableGeoFencing,
      schoolLatitude: updates.schoolLatitude === '' || updates.schoolLatitude == null ? null : Number(updates.schoolLatitude),
      schoolLongitude: updates.schoolLongitude === '' || updates.schoolLongitude == null ? null : Number(updates.schoolLongitude),
      allowedRadiusMeters: updates.allowedRadius === '' || updates.allowedRadius == null
        ? null
        : Number(updates.allowedRadius ?? updates.allowedRadiusMeters),
      autoMarkAbsent: updates.autoMarkAbsent,
      autoMarkTime: updates.autoMarkTime,
      requireApprovalDays: updates.approvalAfterDays ?? updates.requireApprovalDays,
      autoApproveLeaves: updates.autoApproveLeaves,
      sendDailyReminders: updates.sendDailyReminders,
      reminderTime: updates.reminderTime,
      notifyParents: updates.notifyParents,
      enableBiometricAttendance: updates.enableBiometricAttendance,
      calculateOnWeekends: updates.calculateOnWeekends,
      minAttendancePercent: updates.attendanceThreshold ?? updates.minAttendancePercent,
    };

    Object.keys(normalizedUpdates).forEach((key) => {
      if (normalizedUpdates[key] === undefined) {
        delete normalizedUpdates[key];
      }
    });

    let updatedSchool = null;
    if (updates.timezone || updates.schoolTimezone || updates.parentNotifyBeforeMinutes !== undefined) {
      const timezone = updates.timezone || updates.schoolTimezone;
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { websiteConfig: true }
      });
      const nextWebsiteConfig = {
        ...(school?.websiteConfig || {}),
      };
      if (timezone) {
        nextWebsiteConfig.timezone = timezone;
      }
      if (updates.parentNotifyBeforeMinutes !== undefined) {
        nextWebsiteConfig.parentNotifyBeforeMinutes = updates.parentNotifyBeforeMinutes === '' || updates.parentNotifyBeforeMinutes == null
          ? 30
          : Number(updates.parentNotifyBeforeMinutes);
      }
      updatedSchool = await prisma.school.update({
        where: { id: schoolId },
        data: {
          websiteConfig: nextWebsiteConfig
        }
      });
    }

    if (normalizedUpdates.halfDayHours !== undefined && (normalizedUpdates.halfDayHours < 0 || normalizedUpdates.halfDayHours > 24)) {
      return NextResponse.json({
        error: 'Half day hours must be between 0 and 24'
      }, { status: 400 });
    }
    if (normalizedUpdates.fullDayHours !== undefined && (normalizedUpdates.fullDayHours < 0 || normalizedUpdates.fullDayHours > 24)) {
      return NextResponse.json({
        error: 'Full day hours must be between 0 and 24'
      }, { status: 400 });
    }

    // Validate geofencing
    if (normalizedUpdates.enableGeoFencing) {
      if (normalizedUpdates.schoolLatitude == null || normalizedUpdates.schoolLongitude == null) {
        return NextResponse.json({
          error: 'School coordinates required when geofencing is enabled'
        }, { status: 400 });
      }
      if (Math.abs(normalizedUpdates.schoolLatitude) > 90 || Math.abs(normalizedUpdates.schoolLongitude) > 180) {
        return NextResponse.json({
          error: 'Invalid coordinates'
        }, { status: 400 });
      }
      if (normalizedUpdates.allowedRadiusMeters == null || Number.isNaN(normalizedUpdates.allowedRadiusMeters) || normalizedUpdates.allowedRadiusMeters <= 0) {
        return NextResponse.json({
          error: 'Allowed radius must be greater than 0'
        }, { status: 400 });
      }
    }

    // Update config
    const updatedConfig = await prisma.attendanceConfig.upsert({
      where: { schoolId },
      update: normalizedUpdates,
      create: {
        schoolId,
        ...normalizedUpdates
      }
    });

    // Update school calendar with new working hours if provided
    if (normalizedUpdates.defaultStartTime || normalizedUpdates.defaultEndTime) {
      const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true }
      });

      if (academicYear) {
        await prisma.schoolCalendar.updateMany({
          where: {
            schoolId,
            dayType: 'WORKING_DAY',
            date: {
              gte: academicYear.startDate,
              lte: academicYear.endDate
            }
          },
          data: {
            ...(normalizedUpdates.defaultStartTime && { startTime: normalizedUpdates.defaultStartTime }),
            ...(normalizedUpdates.defaultEndTime && { endTime: normalizedUpdates.defaultEndTime })
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance settings updated successfully',
      config: {
        ...updatedConfig,
        timezone: getSchoolTimezone(updatedSchool || { websiteConfig: { timezone: updates.timezone || updates.schoolTimezone } }),
        parentNotifyBeforeMinutes: updatedSchool?.websiteConfig?.parentNotifyBeforeMinutes ?? updates.parentNotifyBeforeMinutes ?? 30,
      }
    });

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({
      error: 'Failed to update settings'
    }, { status: 500 });
  }
}

// POST - Test geofencing configuration
export async function POST(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const { latitude, longitude } = await req.json();

  try {
    const config = await prisma.attendanceConfig.findUnique({
      where: { schoolId }
    });

    if (!config || !config.enableGeoFencing) {
      return NextResponse.json({
        error: 'Geofencing not enabled'
      }, { status: 400 });
    }

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      latitude,
      longitude,
      config.schoolLatitude,
      config.schoolLongitude
    );

    const isWithinRadius = distance <= config.allowedRadiusMeters;

    return NextResponse.json({
      distance: Math.round(distance),
      allowedRadius: config.allowedRadiusMeters,
      isWithinRadius,
      message: isWithinRadius
        ? `Location is within ${config.allowedRadiusMeters}m radius`
        : `Location is ${Math.round(distance - config.allowedRadiusMeters)}m outside allowed radius`
    });

  } catch (error) {
    console.error('Geofencing test error:', error);
    return NextResponse.json({
      error: 'Failed to test geofencing'
    }, { status: 500 });
  }
}

// Helper function
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
