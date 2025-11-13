// ============================================
// FILE: app/api/schools/[schoolId]/calendar/populate/route.js
// Populate School Calendar with working days and holidays
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';

// GET - Check calendar status
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        
        // Get academic year
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        
        if (!academicYear) {
            return NextResponse.json({ 
                error: 'No active academic year found' 
            }, { status: 404 });
        }
        
        // Count existing calendar entries
        const calendarCount = await prisma.schoolCalendar.count({
            where: {
                schoolId,
                date: {
                    gte: academicYear.startDate,
                    lte: academicYear.endDate,
                },
            },
        });
        
        // Get breakdown by type
        const breakdown = await prisma.schoolCalendar.groupBy({
            by: ['dayType'],
            where: {
                schoolId,
                date: {
                    gte: academicYear.startDate,
                    lte: academicYear.endDate,
                },
            },
            _count: true,
        });
        
        return NextResponse.json({
            academicYear: {
                id: academicYear.id,
                name: academicYear.name,
                startDate: academicYear.startDate,
                endDate: academicYear.endDate,
            },
            calendarStats: {
                total: calendarCount,
                breakdown: breakdown.reduce((acc, item) => {
                    acc[item.dayType] = item._count;
                    return acc;
                }, {}),
            },
            isPopulated: calendarCount > 0,
        });
        
    } catch (error) {
        console.error('[CALENDAR STATUS ERROR]', error);
        return NextResponse.json({ 
            error: error.message 
        }, { status: 500 });
    }
}

// POST - Populate calendar
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        
        const {
            forceRefresh = false,
            fetchGoogleHolidays = true,
            workingDays = [1, 2, 3, 4, 5, 6], // Mon-Sat by default
            startTime = '09:00',
            endTime = '17:00',
        } = body;
        
        console.log('[CALENDAR POPULATE] Starting for school:', schoolId);
        
        // Get active academic year
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        
        if (!academicYear) {
            return NextResponse.json({ 
                error: 'No active academic year found' 
            }, { status: 404 });
        }
        
        const startDate = new Date(academicYear.startDate);
        const endDate = new Date(academicYear.endDate);
        
        console.log(`[CALENDAR] Academic Year: ${academicYear.name}`);
        console.log(`[CALENDAR] Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        // Check if already populated
        if (!forceRefresh) {
            const existingCount = await prisma.schoolCalendar.count({
                where: {
                    schoolId,
                    date: { gte: startDate, lte: endDate },
                },
            });
            
            if (existingCount > 0) {
                return NextResponse.json({
                    message: 'Calendar already populated. Use forceRefresh=true to regenerate.',
                    existingCount,
                }, { status: 409 });
            }
        }
        
        // Fetch holidays from Google Calendar
        let holidays = [];
        if (fetchGoogleHolidays) {
            try {
                holidays = await fetchIndianHolidays(startDate, endDate);
                console.log(`[CALENDAR] Fetched ${holidays.length} holidays from Google Calendar`);
            } catch (error) {
                console.error('[CALENDAR] Failed to fetch Google holidays:', error.message);
                // Continue without holidays
            }
        }
        
        // Create holiday map for quick lookup
        const holidayMap = new Map(
            holidays.map(h => [h.date, h.name])
        );
        
        // Generate calendar entries
        const entries = [];
        let current = new Date(startDate);
        
        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
            
            let entry = {
                schoolId,
                date: new Date(current),
                isHoliday: false,
                startTime: null,
                endTime: null,
                description: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            
            // Check if it's a holiday from Google Calendar
            if (holidayMap.has(dateStr)) {
                entry.dayType = 'HOLIDAY';
                entry.isHoliday = true;
                entry.holidayName = holidayMap.get(dateStr);
                entry.description = `Public Holiday: ${holidayMap.get(dateStr)}`;
            }
            // Check if it's a weekend
            else if (!workingDays.includes(dayOfWeek)) {
                entry.dayType = 'WEEKEND';
                entry.description = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
            }
            // Working day
            else {
                entry.dayType = 'WORKING_DAY';
                entry.startTime = startTime;
                entry.endTime = endTime;
            }
            
            entries.push(entry);
            current.setDate(current.getDate() + 1);
        }
        
        console.log(`[CALENDAR] Generated ${entries.length} calendar entries`);
        
        // Clear existing entries if force refresh
        if (forceRefresh) {
            const deleted = await prisma.schoolCalendar.deleteMany({
                where: {
                    schoolId,
                    date: { gte: startDate, lte: endDate },
                },
            });
            console.log(`[CALENDAR] Deleted ${deleted.count} existing entries`);
        }
        
        // Insert entries in batches
        const batchSize = 100;
        let inserted = 0;
        
        for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const result = await prisma.schoolCalendar.createMany({
                data: batch,
                skipDuplicates: true,
            });
            inserted += result.count;
            console.log(`[CALENDAR] Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)}`);
        }
        
        // Get summary
        const summary = await prisma.schoolCalendar.groupBy({
            by: ['dayType'],
            where: {
                schoolId,
                date: { gte: startDate, lte: endDate },
            },
            _count: true,
        });
        
        const stats = summary.reduce((acc, item) => {
            acc[item.dayType] = item._count;
            return acc;
        }, {});
        
        console.log('[CALENDAR] Population completed successfully');
        
        return NextResponse.json({
            success: true,
            message: 'School calendar populated successfully',
            academicYear: {
                id: academicYear.id,
                name: academicYear.name,
                startDate: academicYear.startDate,
                endDate: academicYear.endDate,
            },
            stats: {
                totalDays: entries.length,
                inserted,
                workingDays: stats.WORKING_DAY || 0,
                weekends: stats.WEEKEND || 0,
                holidays: stats.HOLIDAY || 0,
                holidaysFromGoogle: holidays.length,
            },
            workingDaysConfig: workingDays,
            workingHours: { startTime, endTime },
        });
        
    } catch (error) {
        console.error('[CALENDAR POPULATE ERROR]', error);
        return NextResponse.json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
    }
}

// DELETE - Clear calendar
export async function DELETE(req, { params }) {
    try {
        const { schoolId } = await params;
        
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        
        if (!academicYear) {
            return NextResponse.json({ 
                error: 'No active academic year found' 
            }, { status: 404 });
        }
        
        const result = await prisma.schoolCalendar.deleteMany({
            where: {
                schoolId,
                date: {
                    gte: academicYear.startDate,
                    lte: academicYear.endDate,
                },
            },
        });
        
        return NextResponse.json({
            success: true,
            message: 'School calendar cleared',
            deletedCount: result.count,
        });
        
    } catch (error) {
        console.error('[CALENDAR DELETE ERROR]', error);
        return NextResponse.json({ 
            error: error.message 
        }, { status: 500 });
    }
}

// ============================================
// HELPER: Fetch Indian Holidays from Google Calendar
// ============================================

async function fetchIndianHolidays(startDate, endDate) {
    try {
        // Create OAuth2 client without credentials (for public calendar)
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        
        // For public calendars, we can use API key instead
        const calendar = google.calendar({ 
            version: 'v3',
            auth: process.env.GOOGLE_API_KEY || oauth2Client,
        });
        
        const response = await calendar.events.list({
            calendarId: 'en.indian#holiday@group.v.calendar.google.com',
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500, // Get all holidays in range
        });
        
        const holidays = (response.data.items || []).map(event => {
            const date = event.start.date || event.start.dateTime?.split('T')[0];
            return {
                date,
                name: event.summary,
                description: event.description,
            };
        });
        
        return holidays;
        
    } catch (error) {
        console.error('[GOOGLE CALENDAR ERROR]', error.message);
        
        // Fallback: Common Indian holidays
        return getDefaultIndianHolidays(startDate.getFullYear());
    }
}

// ============================================
// FALLBACK: Default Indian Holidays
// ============================================

function getDefaultIndianHolidays(year) {
    return [
        { date: `${year}-01-26`, name: 'Republic Day' },
        { date: `${year}-08-15`, name: 'Independence Day' },
        { date: `${year}-10-02`, name: 'Gandhi Jayanti' },
        { date: `${year}-12-25`, name: 'Christmas' },
        // Add more common holidays
    ];
}