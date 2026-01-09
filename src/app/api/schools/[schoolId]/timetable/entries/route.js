import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// GET /api/schools/[schoolId]/timetable/entries
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get('classId');
        const sectionId = searchParams.get('sectionId');
        const teacherId = searchParams.get('teacherId');
        const dayOfWeek = searchParams.get('dayOfWeek');

        const where = {
            schoolId,
            ...(classId && { classId: parseInt(classId) }),
            ...(sectionId && { sectionId: parseInt(sectionId) }),
            ...(teacherId && { teacherId }),
            ...(dayOfWeek && { dayOfWeek: parseInt(dayOfWeek) }),
        };

        const entries = await prisma.timetableEntry.findMany({
            where,
            include: {
                class: {
                    select: { id: true, className: true },
                },
                section: {
                    select: { id: true, name: true },
                },
                subject: {
                    select: { id: true, subjectName: true, subjectCode: true },
                },
                teacher: {
                    select: { userId: true, name: true },
                },
                timeSlot: {
                    select: { id: true, label: true, startTime: true, endTime: true, sequence: true },
                },
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { timeSlot: { sequence: 'asc' } },
            ],
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error('Error fetching timetable entries:', error);
        return NextResponse.json(
            { error: 'Failed to fetch timetable entries' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/timetable/entries
export async function POST(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const { classId, sectionId, subjectId, teacherId, timeSlotId, dayOfWeek, roomNumber, notes } = body;

        if (!classId || !subjectId || !teacherId || !timeSlotId || dayOfWeek == null) {
            return NextResponse.json(
                { error: 'Class, subject, teacher, time slot, and day are required' },
                { status: 400 }
            );
        }

        // Check for conflicts
        // 1. Same teacher, same time, same day
        const teacherConflict = await prisma.timetableEntry.findFirst({
            where: {
                teacherId,
                timeSlotId,
                dayOfWeek: parseInt(dayOfWeek),
                schoolId,
            },
            include: {
                class: { select: { className: true } },
                timeSlot: { select: { label: true } },
            },
        });

        if (teacherConflict) {
            return NextResponse.json(
                {
                    error: 'Teacher conflict',
                    message: `Teacher is already assigned to ${teacherConflict.class.className} at ${teacherConflict.timeSlot.label}`,
                },
                { status: 409 }
            );
        }

        // 2. Same class/section, same time, same day
        const classConflict = await prisma.timetableEntry.findFirst({
            where: {
                classId: parseInt(classId),
                sectionId: sectionId ? parseInt(sectionId) : null,
                timeSlotId,
                dayOfWeek: parseInt(dayOfWeek),
                schoolId,
            },
        });

        if (classConflict) {
            return NextResponse.json(
                {
                    error: 'Class conflict',
                    message: 'This class/section already has a subject at this time',
                },
                { status: 409 }
            );
        }

        // 3. Room conflict (if room is specified)
        if (roomNumber) {
            const roomConflict = await prisma.timetableEntry.findFirst({
                where: {
                    roomNumber,
                    timeSlotId,
                    dayOfWeek: parseInt(dayOfWeek),
                    schoolId,
                },
                include: {
                    class: { select: { className: true } },
                    section: { select: { name: true } },
                },
            });

            if (roomConflict) {
                return NextResponse.json(
                    {
                        error: 'Room conflict',
                        message: `Room ${roomNumber} is already used by ${roomConflict.class.className}${roomConflict.section ? ' - ' + roomConflict.section.name : ''} at this time`,
                    },
                    { status: 409 }
                );
            }
        }

        const entry = await prisma.timetableEntry.create({
            data: {
                schoolId,
                classId: parseInt(classId),
                sectionId: sectionId ? parseInt(sectionId) : null,
                subjectId: parseInt(subjectId),
                teacherId,
                timeSlotId,
                dayOfWeek: parseInt(dayOfWeek),
                roomNumber: roomNumber || null,
                notes: notes || null,
            },
            include: {
                class: { select: { className: true } },
                section: { select: { name: true } },
                subject: { select: { subjectName: true } },
                teacher: { select: { name: true } },
                timeSlot: { select: { label: true, startTime: true, endTime: true } },
            },
        });

        // Sync with TeacherShift - Create shift entries for the next 4 weeks
        // This ensures weekly timetable and daily shifts stay in sync
        // RESPECTS OVERRIDES: If admin manually edited a shift (isOverride=true), skip it
        if (sectionId) {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Generate dates for the next 4 weeks that match this dayOfWeek
                for (let week = 0; week < 4; week++) {
                    const targetDate = new Date(today);
                    // Find the next occurrence of this dayOfWeek
                    const currentDayOfWeek = today.getDay();
                    const targetDayOfWeek = parseInt(dayOfWeek);
                    let daysToAdd = targetDayOfWeek - currentDayOfWeek;
                    if (daysToAdd < 0) daysToAdd += 7;
                    if (daysToAdd === 0 && week === 0) daysToAdd = 0; // Today if it matches

                    targetDate.setDate(today.getDate() + daysToAdd + (week * 7));

                    // Check if there's an existing override for this slot
                    const existingShift = await prisma.teacherShift.findUnique({
                        where: {
                            teacherId_date_timeSlotId: {
                                teacherId,
                                date: targetDate,
                                timeSlotId,
                            },
                        },
                    });

                    // Skip if it's an override (admin manually edited)
                    if (existingShift?.isOverride) {
                        continue;
                    }

                    // Create or update the shift (preserving non-override status)
                    await prisma.teacherShift.upsert({
                        where: {
                            teacherId_date_timeSlotId: {
                                teacherId,
                                date: targetDate,
                                timeSlotId,
                            },
                        },
                        update: {
                            classId: parseInt(classId),
                            sectionId: parseInt(sectionId),
                            subjectId: parseInt(subjectId),
                            roomNumber: roomNumber || null,
                            notes: notes || null,
                            timetableEntryId: entry.id,
                            isOverride: false, // Reset to non-override if updating from timetable
                        },
                        create: {
                            schoolId,
                            classId: parseInt(classId),
                            sectionId: parseInt(sectionId),
                            subjectId: parseInt(subjectId),
                            teacherId,
                            timeSlotId,
                            date: targetDate,
                            roomNumber: roomNumber || null,
                            notes: notes || null,
                            status: 'ASSIGNED',
                            timetableEntryId: entry.id,
                            isOverride: false,
                        },
                    });
                }
            } catch (shiftError) {
                console.warn('Failed to sync teacher shifts:', shiftError.message);
                // Don't fail the main operation if shift sync fails
            }
        }

        // Send notification to parents of students in this class/section
        // Only notify parents whose children are in the specific section
        try {
            const parentTargetOptions = {
                userTypes: ['STUDENT'],
                includeParents: true,
            };

            // If sectionId is provided, target only that section
            // Otherwise target the whole class
            if (sectionId) {
                parentTargetOptions.sectionIds = [parseInt(sectionId)];
            } else {
                parentTargetOptions.classIds = [parseInt(classId)];
            }

            // Notify parents
            await sendNotification({
                schoolId,
                title: '📅 Timetable Updated',
                message: `Timetable for ${entry.class.className}${entry.section ? ' - ' + entry.section.name : ''} has been updated.`,
                type: 'GENERAL',
                priority: 'NORMAL',
                icon: '📅',
                targetOptions: parentTargetOptions,
                sendPush: true,
                actionUrl: '/my-child/parent-timetable',
            });

            // Notify the specific assigned teacher directly (not via class/section targeting)
            // This ensures the teacher who was assigned to this period gets notified
            await sendNotification({
                schoolId,
                title: '📅 You Have Been Assigned',
                message: `You have been assigned to teach ${entry.subject.subjectName} for ${entry.class.className}${entry.section ? ' - ' + entry.section.name : ''} at ${entry.timeSlot.label}.`,
                type: 'GENERAL',
                priority: 'NORMAL',
                icon: '📅',
                targetOptions: {
                    userIds: [teacherId], // Direct notification to the assigned teacher
                },
                sendPush: true,
                actionUrl: '/dashboard/timetable/view/teacher',
            });
        } catch (notifErr) {
            console.warn('Timetable notification failed:', notifErr.message);
        }

        return NextResponse.json(entry);
    } catch (error) {
        console.error('Error creating timetable entry:', error);
        return NextResponse.json(
            { error: 'Failed to create timetable entry' },
            { status: 500 }
        );
    }
}
