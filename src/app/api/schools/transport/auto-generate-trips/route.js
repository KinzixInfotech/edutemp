// Auto-Generate Trips API - Called by cron job or on-demand
// Generates trips for all schools that have auto-generation enabled

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Helper to get day name
const getDayName = (date) => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
};

// Helper to add days to a date
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

export async function POST(req) {
    try {
        const data = await req.json();
        const { cronSecret } = data;

        // Optional: Verify cron secret for security
        // You can set CRON_SECRET in env and verify here
        // if (cronSecret !== process.env.CRON_SECRET) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        // Get all schools with auto-generation enabled
        const settings = await prisma.transportSettings.findMany({
            where: { autoGenerateTrips: true }
        });

        if (settings.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No schools have auto-generation enabled',
                results: []
            });
        }

        const results = [];

        for (const setting of settings) {
            const { schoolId, generateDaysInAdvance } = setting;

            // Calculate target date (X days in advance)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const targetDate = addDays(today, generateDaysInAdvance);
            targetDate.setHours(0, 0, 0, 0);

            const dateStr = targetDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });

            // Check calendar for the date - holiday and working day check
            const calendarEntry = await prisma.schoolCalendar.findUnique({
                where: {
                    schoolId_date: {
                        schoolId,
                        date: targetDate
                    }
                }
            });

            // Check if it's a holiday
            if (calendarEntry?.isHoliday) {
                results.push({
                    schoolId,
                    status: 'skipped',
                    reason: 'HOLIDAY',
                    message: `${dateStr} is a holiday: ${calendarEntry.holidayName || 'School Holiday'}`,
                    date: dateStr
                });
                continue;
            }

            // Check if it's a working day based on SchoolCalendar.dayType
            // If calendar entry exists and is not a working day, skip
            if (calendarEntry && calendarEntry.dayType !== 'WORKING_DAY') {
                results.push({
                    schoolId,
                    status: 'skipped',
                    reason: 'NON_WORKING_DAY',
                    message: `${dateStr} is not a working day (${calendarEntry.dayType})`,
                    date: dateStr
                });
                continue;
            }

            // Check for suspension
            const suspension = await prisma.busServiceSuspension.findFirst({
                where: {
                    schoolId,
                    startDate: { lte: targetDate },
                    endDate: { gte: targetDate }
                }
            });

            if (suspension) {
                results.push({
                    schoolId,
                    status: 'skipped',
                    reason: 'SERVICE_SUSPENDED',
                    message: `Bus service suspended: ${suspension.reason}`,
                    date: dateStr
                });
                continue;
            }

            // Get active assignments and create trips
            const assignments = await prisma.routeAssignment.findMany({
                where: { schoolId, isActive: true },
                include: {
                    route: { select: { id: true, name: true } },
                    vehicle: { select: { id: true } },
                    driver: { select: { id: true } },
                    conductor: { select: { id: true } }
                }
            });

            let created = 0;
            let skipped = 0;

            for (const assignment of assignments) {
                for (const tripType of ['PICKUP', 'DROP']) {
                    try {
                        // Check if already exists
                        const existing = await prisma.busTrip.findFirst({
                            where: {
                                routeId: assignment.routeId,
                                vehicleId: assignment.vehicleId,
                                tripType,
                                date: targetDate
                            }
                        });

                        if (existing) {
                            skipped++;
                            continue;
                        }

                        await prisma.busTrip.create({
                            data: {
                                vehicleId: assignment.vehicleId,
                                routeId: assignment.routeId,
                                driverId: assignment.driverId,
                                conductorId: assignment.conductorId,
                                tripType,
                                status: 'SCHEDULED',
                                date: targetDate
                            }
                        });
                        created++;
                    } catch (e) {
                        if (e.code === 'P2002') skipped++;
                        else console.error(`Error creating trip:`, e);
                    }
                }
            }

            results.push({
                schoolId,
                status: 'success',
                date: dateStr,
                created,
                skipped,
                message: `Generated ${created} trips for ${dateStr}`
            });
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            schoolsProcessed: settings.length,
            results
        });

    } catch (error) {
        console.error('Error in auto-generate trips:', error);
        return NextResponse.json({
            error: 'Failed to auto-generate trips',
            details: error.message
        }, { status: 500 });
    }
}
