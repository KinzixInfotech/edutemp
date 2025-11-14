// ============================================
// FILE: app/api/schools/[schoolId]/calendar/populate/route.js
// Populate School Calendar with working days and holidays
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';

// Helper: Get/Set calendar configuration metadata
const CONFIG_KEY = '__CALENDAR_CONFIG__';

async function getCalendarConfig(schoolId) {
    try {
        const configEntry = await prisma.schoolCalendar.findFirst({
            where: {
                schoolId,
                description: { startsWith: CONFIG_KEY },
            },
        });

        if (configEntry && configEntry.description) {
            const configJson = configEntry.description.replace(CONFIG_KEY, '');
            return JSON.parse(configJson);
        }
    } catch (error) {
        console.error('[CONFIG] Failed to parse stored config:', error);
    }
    return null;
}

async function saveCalendarConfig(schoolId, config) {
    try {
        const configData = {
            workingDays: config.workingDays,
            startTime: config.startTime,
            endTime: config.endTime,
            fetchGoogleHolidays: config.fetchGoogleHolidays,
            lastPopulated: new Date().toISOString(),
        };

        // Use a far future date that won't conflict with actual calendar
        const configDate = new Date('2099-12-31');

        await prisma.schoolCalendar.upsert({
            where: {
                schoolId_date: {
                    schoolId,
                    date: configDate,
                },
            },
            update: {
                description: CONFIG_KEY + JSON.stringify(configData),
                updatedAt: new Date(),
            },
            create: {
                schoolId,
                date: configDate,
                dayType: 'WEEKEND', // Hidden entry
                isHoliday: false,
                description: CONFIG_KEY + JSON.stringify(configData),
            },
        });
    } catch (error) {
        console.error('[CONFIG] Failed to save config:', error);
    }
}

// GET - Check calendar status with configuration details
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
        
        // Count existing calendar entries (exclude config entry)
        const calendarCount = await prisma.schoolCalendar.count({
            where: {
                schoolId,
                date: {
                    gte: academicYear.startDate,
                    lte: academicYear.endDate,
                },
                OR: [
                    { description: null },
                    { description: { not: { startsWith: CONFIG_KEY } } },
                ],
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
                OR: [
                    { description: null },
                    { description: { not: { startsWith: CONFIG_KEY } } },
                ],
            },
            _count: true,
        });
        
        // Get sample entries with all fields
        const sampleEntries = await prisma.schoolCalendar.findMany({
            where: {
                schoolId,
                date: {
                    gte: academicYear.startDate,
                    lte: academicYear.endDate,
                },
                OR: [
                    { description: null },
                    { description: { not: { startsWith: CONFIG_KEY } } },
                ],
            },
            select: {
                id: true,
                date: true,
                dayType: true,
                isHoliday: true,
                holidayName: true,
                startTime: true,
                endTime: true,
                description: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                date: 'asc',
            },
            take: 10,
        });

        // Fetch stored configuration
        const storedConfig = await getCalendarConfig(schoolId);

        // Use stored config or extract from entries as fallback
        let currentConfig;
        
        if (storedConfig) {
            currentConfig = storedConfig;
        } else if (calendarCount > 0) {
            // Fallback: Extract from existing entries
                            const workingDaysData = await prisma.schoolCalendar.findMany({
                where: {
                    schoolId,
                    date: {
                        gte: academicYear.startDate,
                        lte: academicYear.endDate,
                    },
                    dayType: 'WORKING_DAY',
                    OR: [
                        { description: null },
                        { description: { not: { startsWith: CONFIG_KEY } } },
                    ],
                },
                select: {
                    date: true,
                    startTime: true,
                    endTime: true,
                },
                take: 100,
            });

            const uniqueDays = new Set();
            workingDaysData.forEach(entry => {
                const dayOfWeek = new Date(entry.date).getDay();
                uniqueDays.add(dayOfWeek);
            });

            const holidayCount = await prisma.schoolCalendar.count({
                where: {
                    schoolId,
                    date: {
                        gte: academicYear.startDate,
                        lte: academicYear.endDate,
                    },
                    dayType: 'HOLIDAY',
                    OR: [
                        { description: null },
                        { description: { not: { startsWith: CONFIG_KEY } } },
                    ],
                },
            });

            currentConfig = {
                workingDays: Array.from(uniqueDays).sort((a, b) => a - b),
                startTime: workingDaysData[0]?.startTime || '09:00',
                endTime: workingDaysData[0]?.endTime || '17:00',
                fetchGoogleHolidays: holidayCount > 0,
            };
        } else {
            // Default config
            currentConfig = {
                workingDays: [1, 2, 3, 4, 5, 6],
                startTime: '09:00',
                endTime: '17:00',
                fetchGoogleHolidays: true,
            };
        }
        
        // Get all entries if requested
        const { searchParams } = new URL(req.url);
        const includeAll = searchParams.get('includeAll') === 'true';
        
        let allEntries = null;
        if (includeAll && calendarCount > 0) {
            allEntries = await prisma.schoolCalendar.findMany({
                where: {
                    schoolId,
                    date: {
                        gte: academicYear.startDate,
                        lte: academicYear.endDate,
                    },
                    OR: [
                        { description: null },
                        { description: { not: { startsWith: CONFIG_KEY } } },
                    ],
                },
                select: {
                    id: true,
                    date: true,
                    dayType: true,
                    isHoliday: true,
                    holidayName: true,
                    startTime: true,
                    endTime: true,
                    description: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: {
                    date: 'asc',
                },
            });
        }
        
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
            currentConfig,
            sampleEntries,
            ...(allEntries && { allEntries }),
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
                    OR: [
                        { description: null },
                        { description: { not: { startsWith: CONFIG_KEY } } },
                    ],
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
                holidays = await fetchIndianHolidays(startDate, endDate, schoolId);
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
        
        // Clear existing entries if force refresh (exclude config entry)
        if (forceRefresh) {
            const deleted = await prisma.schoolCalendar.deleteMany({
                where: {
                    schoolId,
                    date: { gte: startDate, lte: endDate },
                    OR: [
                        { description: null },
                        { description: { not: { startsWith: CONFIG_KEY } } },
                    ],
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
        
        // Save configuration
        await saveCalendarConfig(schoolId, {
            workingDays,
            startTime,
            endTime,
            fetchGoogleHolidays,
        });
        
        console.log('[CALENDAR] Configuration saved:', { workingDays, startTime, endTime, fetchGoogleHolidays });
        
        // Get summary
        const summary = await prisma.schoolCalendar.groupBy({
            by: ['dayType'],
            where: {
                schoolId,
                date: { gte: startDate, lte: endDate },
                OR: [
                    { description: null },
                    { description: { not: { startsWith: CONFIG_KEY } } },
                ],
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
        
        // Delete all entries including config
        const result = await prisma.schoolCalendar.deleteMany({
            where: {
                schoolId,
                OR: [
                    {
                        date: {
                            gte: academicYear.startDate,
                            lte: academicYear.endDate,
                        },
                    },
                    {
                        description: { startsWith: CONFIG_KEY },
                    },
                ],
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

async function fetchIndianHolidays(startDate, endDate, schoolId) {
    try {
        // Try to get authenticated Gmail account (same as events route)
        const gmailAccount = await prisma.gmailAccount.findFirst({
            where: {
                user: {
                    schoolId,
                },
            },
            orderBy: { lastUsedAt: 'desc' },
        });

        if (gmailAccount && gmailAccount.accessToken) {
            console.log('[GOOGLE CALENDAR] Using authenticated user account');
            
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );

            oauth2Client.setCredentials({
                access_token: gmailAccount.accessToken,
                refresh_token: gmailAccount.refreshToken,
            });

            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            const response = await calendar.events.list({
                calendarId: 'en.indian#holiday@group.v.calendar.google.com',
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 2500,
            });

            // Update last used timestamp
            await prisma.gmailAccount.update({
                where: { id: gmailAccount.id },
                data: { lastUsedAt: new Date() },
            });

            const holidays = (response.data.items || []).map(event => {
                const date = event.start.date || event.start.dateTime?.split('T')[0];
                return {
                    date,
                    name: event.summary,
                    description: event.description,
                };
            });
            
            console.log(`[GOOGLE CALENDAR] Successfully fetched ${holidays.length} holidays`);
            return holidays;
        } else {
            console.log('[GOOGLE CALENDAR] No authenticated account found, using default holidays');
            return getDefaultIndianHolidays(startDate.getFullYear());
        }
        
    } catch (error) {
        console.error('[GOOGLE CALENDAR ERROR]', error.message);
        console.log('[GOOGLE CALENDAR] Falling back to default holidays');
        
        // If token expired, try to refresh
        if (error.code === 401) {
            console.log('[GOOGLE CALENDAR] Token expired, user needs to reconnect');
        }
        
        return getDefaultIndianHolidays(startDate.getFullYear());
    }
}

// ============================================
// FALLBACK: Default Indian Holidays
// ============================================

function getDefaultIndianHolidays(year) {
    return [
        // National Holidays
        { date: `${year}-01-26`, name: 'Republic Day' },
        { date: `${year}-08-15`, name: 'Independence Day' },
        { date: `${year}-10-02`, name: 'Gandhi Jayanti' },
        
        // Religious Holidays (approximate dates - vary by lunar calendar)
        { date: `${year}-03-08`, name: 'Maha Shivaratri' },
        { date: `${year}-03-25`, name: 'Holi' },
        { date: `${year}-04-10`, name: 'Ram Navami' },
        { date: `${year}-04-14`, name: 'Ambedkar Jayanti' },
        { date: `${year}-04-17`, name: 'Good Friday' },
        { date: `${year}-08-16`, name: 'Janmashtami' },
        { date: `${year}-09-07`, name: 'Ganesh Chaturthi' },
        { date: `${year}-10-12`, name: 'Dussehra' },
        { date: `${year}-10-31`, name: 'Diwali' },
        { date: `${year}-11-15`, name: 'Guru Nanak Jayanti' },
        { date: `${year}-12-25`, name: 'Christmas' },
        
        // Islamic Holidays (approximate - vary by lunar calendar)
        { date: `${year}-03-31`, name: 'Eid ul-Fitr' },
        { date: `${year}-06-17`, name: 'Eid ul-Adha' },
        { date: `${year}-09-16`, name: 'Muharram' },
    ];
}