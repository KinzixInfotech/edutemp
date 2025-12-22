// app/api/schools/[schoolId]/attendance/admin/settings/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Default attendance config values
// Note: Fields with schema defaults like autoMarkTime, reminderTime are omitted
// so Prisma uses the schema-defined defaults
const DEFAULT_ATTENDANCE_CONFIG = {
  defaultStartTime: '09:00',
  defaultEndTime: '17:00',
  gracePeriodMinutes: 15,
  halfDayHours: 4,
  fullDayHours: 8,
  enableGeoFencing: false,
  allowedRadiusMeters: 500,
  autoMarkAbsent: true,
  autoMarkTime: '10:00',
  requireApprovalDays: 3,
  autoApproveLeaves: false,
  sendDailyReminders: true,
  reminderTime: '08:30',
  notifyParents: true,
  calculateOnWeekends: false,
  minAttendancePercent: 75,
};

// GET - Fetch current attendance config (auto-creates if not exists)
export async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  console.log('Attendance settings GET for schoolId:', schoolId);

  try {
    let config = await prisma.attendanceConfig.findUnique({
      where: { schoolId }
    });

    // Auto-create default config if not found
    if (!config) {
      console.log('No attendance config found, creating defaults for:', schoolId);
      config = await prisma.attendanceConfig.create({
        data: {
          school: { connect: { id: schoolId } },
          ...DEFAULT_ATTENDANCE_CONFIG,
        }
      });
      console.log('Default attendance config created');
    }

    return NextResponse.json({
      config: {
        // Working Hours
        defaultStartTime: config.defaultStartTime,
        defaultEndTime: config.defaultEndTime,
        gracePeriodMinutes: config.gracePeriodMinutes,
        halfDayHours: config.halfDayHours,
        fullDayHours: config.fullDayHours,

        // Geo-fencing
        enableGeoFencing: config.enableGeoFencing,
        schoolLatitude: config.schoolLatitude,
        schoolLongitude: config.schoolLongitude,
        allowedRadiusMeters: config.allowedRadiusMeters,

        // Auto-marking
        autoMarkAbsent: config.autoMarkAbsent,
        autoMarkTime: config.autoMarkTime,

        // Approval
        requireApprovalDays: config.requireApprovalDays,
        autoApproveLeaves: config.autoApproveLeaves,

        // Notifications
        sendDailyReminders: config.sendDailyReminders,
        reminderTime: config.reminderTime,
        notifyParents: config.notifyParents,

        // Stats
        calculateOnWeekends: config.calculateOnWeekends,
        minAttendancePercent: config.minAttendancePercent
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

    // Validate hours
    if (updates.halfDayHours && (updates.halfDayHours < 0 || updates.halfDayHours > 24)) {
      return NextResponse.json({
        error: 'Half day hours must be between 0 and 24'
      }, { status: 400 });
    }
    if (updates.fullDayHours && (updates.fullDayHours < 0 || updates.fullDayHours > 24)) {
      return NextResponse.json({
        error: 'Full day hours must be between 0 and 24'
      }, { status: 400 });
    }

    // Validate geofencing
    if (updates.enableGeoFencing) {
      if (!updates.schoolLatitude || !updates.schoolLongitude) {
        return NextResponse.json({
          error: 'School coordinates required when geofencing is enabled'
        }, { status: 400 });
      }
      if (Math.abs(updates.schoolLatitude) > 90 || Math.abs(updates.schoolLongitude) > 180) {
        return NextResponse.json({
          error: 'Invalid coordinates'
        }, { status: 400 });
      }
    }

    // Update config
    const updatedConfig = await prisma.attendanceConfig.upsert({
      where: { schoolId },
      update: updates,
      create: {
        schoolId,
        ...updates
      }
    });

    // Update school calendar with new working hours if provided
    if (updates.defaultStartTime || updates.defaultEndTime) {
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
            ...(updates.defaultStartTime && { startTime: updates.defaultStartTime }),
            ...(updates.defaultEndTime && { endTime: updates.defaultEndTime })
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance settings updated successfully',
      config: updatedConfig
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