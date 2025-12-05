import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from "@/lib/cache";

// GET /api/schools/[schoolId]/timetable/view/teacher/[teacherId]
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId, teacherId } = params;

        const cacheKey = generateKey('timetable:view:teacher', { schoolId, teacherId });

        const timetableData = await remember(cacheKey, async () => {
            // Fetch all time slots for the school
            const timeSlots = await prisma.timeSlot.findMany({
                where: { schoolId },
                orderBy: { sequence: 'asc' },
            });

            // Fetch all timetable entries for this teacher
            const entries = await prisma.timetableEntry.findMany({
                where: {
                    schoolId,
                    teacherId,
                    isActive: true,
                },
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
                    timeSlot: {
                        select: { id: true, label: true, startTime: true, endTime: true, sequence: true, isBreak: true },
                    },
                },
                orderBy: [
                    { dayOfWeek: 'asc' },
                    { timeSlot: { sequence: 'asc' } },
                ],
            });

            // Organize by day and time slot
            const timetable = {
                1: {}, // Monday
                2: {}, // Tuesday
                3: {}, // Wednesday
                4: {}, // Thursday
                5: {}, // Friday
                6: {}, // Saturday
            };

            entries.forEach((entry) => {
                if (!timetable[entry.dayOfWeek]) {
                    timetable[entry.dayOfWeek] = {};
                }
                timetable[entry.dayOfWeek][entry.timeSlotId] = {
                    id: entry.id,
                    class: entry.class,
                    section: entry.section,
                    subject: entry.subject,
                    roomNumber: entry.roomNumber,
                    notes: entry.notes,
                };
            });

            return {
                timeSlots,
                timetable,
                teacherId,
            };
        }, 300);

        return NextResponse.json(timetableData);
    } catch (error) {
        console.error('Error fetching teacher timetable:', error);
        return NextResponse.json(
            { error: 'Failed to fetch teacher timetable' },
            { status: 500 }
        );
    }
}
