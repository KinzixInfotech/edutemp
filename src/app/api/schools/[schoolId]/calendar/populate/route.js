// ============================================
// FILE: app/api/schools/[schoolId]/calendar/populate/route.js
// Populate School Calendar with working days and holidays
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { google } from 'googleapis';

// Helper: Get/Set calendar configuration metadata
const CONFIG_KEY = '__CALENDAR_CONFIG__';

// async function getCalendarConfig(schoolId) {
//     try {
//         const configEntry = await prisma.schoolCalendar.findFirst({
//             where: {
//                 schoolId,
//                 description: { startsWith: CONFIG_KEY },
//             },
//         });

//         if (configEntry && configEntry.description) {
//             const configJson = configEntry.description.replace(CONFIG_KEY, '');
//             return JSON.parse(configJson);
//         }
//     } catch (error) {
//         console.error('[CONFIG] Failed to parse stored config:', error);
//     }
//     return null;
// }

// async function saveCalendarConfig(schoolId, config) {
//     try {
//         const configData = {
//             workingDays: config.workingDays,
//             startTime: config.startTime,
//             endTime: config.endTime,
//             fetchGoogleHolidays: config.fetchGoogleHolidays,
//             lastPopulated: new Date().toISOString(),
//         };

//         // Use a far future date that won't conflict with actual calendar
//         const configDate = new Date('2099-12-31');

//         await prisma.schoolCalendar.upsert({
//             where: {
//                 schoolId_date: {
//                     schoolId,
//                     date: configDate,
//                 },
//             },
//             update: {
//                 description: CONFIG_KEY + JSON.stringify(configData),
//                 updatedAt: new Date(),
//             },
//             create: {
//                 schoolId,
//                 date: configDate,
//                 dayType: 'WEEKEND', // Hidden entry
//                 isHoliday: false,
//                 description: CONFIG_KEY + JSON.stringify(configData),
//             },
//         });
//     } catch (error) {
//         console.error('[CONFIG] Failed to save config:', error);
//     }
// }


// ============================================
// FILE: app/api/schools/[schoolId]/calendar/populate/route.js
// Populate School Calendar + AttendanceConfig
// ============================================

// import { NextResponse } from 'next/server';
// import prisma from '@/lib/prisma';
// import { google } from 'googleapis';

// -------------------------------------------------------------------
// CONFIG STORAGE (hidden entry)
// -------------------------------------------------------------------


async function getCalendarConfig(schoolId) {
    try {
        const entry = await prisma.schoolCalendar.findFirst({
            where: { schoolId, description: { startsWith: CONFIG_KEY } },
        });
        if (entry?.description) {
            return JSON.parse(entry.description.replace(CONFIG_KEY, ''));
        }
    } catch (e) {
        console.error('[CONFIG] parse error', e);
    }
    return null;
}

async function saveCalendarConfig(schoolId, config) {
    const payload = {
        workingDays: config.workingDays,
        startTime: config.startTime,
        endTime: config.endTime,
        fetchGoogleHolidays: config.fetchGoogleHolidays,
        lastPopulated: new Date().toISOString(),
    };
    const farFuture = new Date('2099-12-31');

    await prisma.schoolCalendar.upsert({
        where: { schoolId_date: { schoolId, date: farFuture } },
        update: { description: CONFIG_KEY + JSON.stringify(payload) },
        create: {
            schoolId,
            date: farFuture,
            dayType: 'WEEKEND',
            description: CONFIG_KEY + JSON.stringify(payload),
        },
    });
}

// -------------------------------------------------------------------
// GET – calendar status + attendance-config flag
// -------------------------------------------------------------------
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        if (!academicYear) {
            return NextResponse.json({ error: 'No active academic year' }, { status: 404 });
        }

        // ---- calendar entries (exclude hidden config) ----
        const where = {
            schoolId,
            date: { gte: academicYear.startDate, lte: academicYear.endDate },
            OR: [
                { description: null },
                { description: { not: { startsWith: CONFIG_KEY } } },
            ],
        };
        const calendarCount = await prisma.schoolCalendar.count({ where });

        const breakdown = await prisma.schoolCalendar.groupBy({
            by: ['dayType'],
            where,
            _count: true,
        });

        // ---- attendance config ----
        const attendanceConfig = await prisma.attendanceConfig.findUnique({
            where: { schoolId },
        });

        // ---- stored calendar config (fallback logic unchanged) ----
        const storedConfig = await getCalendarConfig(schoolId);
        let currentConfig = storedConfig;

        if (!currentConfig && calendarCount > 0) {
            // fallback – infer from existing entries
            const sample = await prisma.schoolCalendar.findMany({
                where: { ...where, dayType: 'WORKING_DAY' },
                select: { date: true, startTime: true, endTime: true },
                take: 100,
            });
            const days = new Set(sample.map(e => new Date(e.date).getDay()));
            currentConfig = {
                workingDays: Array.from(days).sort((a, b) => a - b),
                startTime: sample[0]?.startTime ?? '09:00',
                endTime: sample[0]?.endTime ?? '17:00',
                fetchGoogleHolidays: true,
            };
        } else if (!currentConfig) {
            currentConfig = { workingDays: [1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '17:00', fetchGoogleHolidays: true };
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
                breakdown: breakdown.reduce((a, c) => ({ ...a, [c.dayType]: c._count }), {}),
            },
            isPopulated: calendarCount > 0,
            currentConfig,
            attendanceConfigCreated: !!attendanceConfig,
            attendanceConfig,               // optional – UI can read times
        });
    } catch (e) {
        console.error('[GET] error', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// -------------------------------------------------------------------
// POST – populate calendar + upsert AttendanceConfig
// -------------------------------------------------------------------
export async function POST(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const {
            forceRefresh = false,
            fetchGoogleHolidays = true,
            workingDays = [1, 2, 3, 4, 5, 6],
            startTime = '09:00',
            endTime = '17:00',
        } = await req.json();

        // ---- academic year -------------------------------------------------
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        if (!academicYear) {
            return NextResponse.json({ error: 'No active academic year' }, { status: 404 });
        }

        const start = new Date(academicYear.startDate);
        const end = new Date(academicYear.endDate);

        // ---- conflict check -------------------------------------------------
        if (!forceRefresh) {
            const existing = await prisma.schoolCalendar.count({
                where: {
                    schoolId,
                    date: { gte: start, lte: end },
                    OR: [
                        { description: null },
                        { description: { not: { startsWith: CONFIG_KEY } } },
                    ],
                },
            });
            if (existing > 0) {
                return NextResponse.json(
                    { message: 'Already populated – use forceRefresh=true' },
                    { status: 409 }
                );
            }
        }

        // ---- Google holidays ------------------------------------------------
        let holidays = [];
        if (fetchGoogleHolidays) {
            try {
                holidays = await fetchIndianHolidays(start, end, schoolId);
            } catch (e) {
                console.warn('[HOLIDAYS] fallback', e);
            }
        }
        const holidayMap = new Map(holidays.map(h => [h.date, h.name]));

        // ---- generate entries ------------------------------------------------
        const entries = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const iso = d.toISOString().split('T')[0];
            const dow = d.getDay();

            const entry = {
                schoolId,
                date: new Date(d),
                isHoliday: false,
                startTime: null,
                endTime: null,
                description: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            if (holidayMap.has(iso)) {
                entry.dayType = 'HOLIDAY';
                entry.isHoliday = true;
                entry.holidayName = holidayMap.get(iso);
                entry.description = `Public Holiday: ${holidayMap.get(iso)}`;
            } else if (!workingDays.includes(dow)) {
                entry.dayType = 'WEEKEND';
                entry.description = dow === 0 ? 'Sunday' : 'Saturday';
            } else {
                entry.dayType = 'WORKING_DAY';
                entry.startTime = startTime;
                entry.endTime = endTime;
            }

            entries.push(entry);
        }

        // ---- delete old (forceRefresh) ---------------------------------------
        if (forceRefresh) {
            await prisma.schoolCalendar.deleteMany({
                where: {
                    schoolId,
                    date: { gte: start, lte: end },
                    OR: [
                        { description: null },
                        { description: { not: { startsWith: CONFIG_KEY } } },
                    ],
                },
            });
        }

        // ---- batch insert ----------------------------------------------------
        const batch = 100;
        let inserted = 0;
        for (let i = 0; i < entries.length; i += batch) {
            const { count } = await prisma.schoolCalendar.createMany({
                data: entries.slice(i, i + batch),
                skipDuplicates: true,
            });
            inserted += count;
        }

        // ---- save calendar config --------------------------------------------
        await saveCalendarConfig(schoolId, {
            workingDays,
            startTime,
            endTime,
            fetchGoogleHolidays,
        });

        // ---- UPSERT AttendanceConfig (THIS IS THE FIX) -----------------------
        await prisma.attendanceConfig.upsert({
            where: { schoolId },
            update: {
                defaultStartTime: startTime,
                defaultEndTime: endTime,
                gracePeriodMinutes: 15,
                halfDayHours: 4,
                fullDayHours: 8,
                enableGeoFencing: false,
                allowedRadiusMeters: 500,
                autoMarkAbsent: true,
                autoMarkTime: '10:00',
            },
            create: {
                schoolId,
                defaultStartTime: startTime,
                defaultEndTime: endTime,
                gracePeriodMinutes: 15,
                halfDayHours: 4,
                fullDayHours: 8,
                enableGeoFencing: false,
                allowedRadiusMeters: 500,
                autoMarkAbsent: true,
                autoMarkTime: '10:00',
            },
        });

        // ---- final stats ------------------------------------------------------
        const summary = await prisma.schoolCalendar.groupBy({
            by: ['dayType'],
            where: {
                schoolId,
                date: { gte: start, lte: end },
                OR: [
                    { description: null },
                    { description: { not: { startsWith: CONFIG_KEY } } },
                ],
            },
            _count: true,
        });
        const stats = summary.reduce((a, c) => ({ ...a, [c.dayType]: c._count }), {});

        return NextResponse.json({
            success: true,
            message: 'Calendar populated',
            stats: {
                totalDays: entries.length,
                inserted,
                workingDays: stats.WORKING_DAY || 0,
                weekends: stats.WEEKEND || 0,
                holidays: stats.HOLIDAY || 0,
                holidaysFromGoogle: holidays.length,
            },
            workingHours: { startTime, endTime },
            attendanceConfigCreated: true,
        });
    } catch (e) {
        console.error('[POST] error', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// -------------------------------------------------------------------
// DELETE – clear calendar (including hidden config)
// -------------------------------------------------------------------
export async function DELETE(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        if (!academicYear) {
            return NextResponse.json({ error: 'No active academic year' }, { status: 404 });
        }

        const { count } = await prisma.schoolCalendar.deleteMany({
            where: {
                schoolId,
                OR: [
                    { date: { gte: academicYear.startDate, lte: academicYear.endDate } },
                    { description: { startsWith: CONFIG_KEY } },
                ],
            },
        });

        return NextResponse.json({ success: true, deletedCount: count });
    } catch (e) {
        console.error('[DELETE] error', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}



//     try {
//         const { schoolId } = params;

//         const academicYear = await prisma.academicYear.findFirst({
//             where: { schoolId, isActive: true },
//         });

//         if (!academicYear) {
//             return NextResponse.json({
//                 error: 'No active academic year found'
//             }, { status: 404 });
//         }

//         // Delete all entries including config
//         const result = await prisma.schoolCalendar.deleteMany({
//             where: {
//                 schoolId,
//                 OR: [
//                     {
//                         date: {
//                             gte: academicYear.startDate,
//                             lte: academicYear.endDate,
//                         },
//                     },
//                     {
//                         description: { startsWith: CONFIG_KEY },
//                     },
//                 ],
//             },
//         });

//         return NextResponse.json({
//             success: true,
//             message: 'School calendar cleared',
//             deletedCount: result.count,
//         });

//     } catch (error) {
//         console.error('[CALENDAR DELETE ERROR]', error);
//         return NextResponse.json({
//             error: error.message
//         }, { status: 500 });
//     }
// }

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