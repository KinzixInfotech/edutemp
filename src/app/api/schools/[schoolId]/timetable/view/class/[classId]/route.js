import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from "@/lib/cache";

// GET /api/schools/[schoolId]/timetable/view/class/[classId]
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId, classId } = params;
        const { searchParams } = new URL(req.url);
        const sectionId = searchParams.get('sectionId');

        const cacheKey = generateKey('timetable:view:class', { schoolId, classId, sectionId });

        const timetableData = await remember(cacheKey, async () => {
            // Fetch all time slots for the school
            const timeSlots = await prisma.timeSlot.findMany({
                where: { schoolId },
                orderBy: { sequence: 'asc' },
            });

            // Fetch all timetable entries for this class
            const entries = await prisma.timetableEntry.findMany({
                where: {
                    schoolId,
                    classId: parseInt(classId),
                    ...(sectionId && { sectionId: parseInt(sectionId) }),
                    isActive: true,
                },
                include: {
                    subject: {
                        select: { id: true, subjectName: true, subjectCode: true },
                    },
                    teacher: {
                        select: { userId: true, name: true },
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
                    subject: entry.subject,
                    teacher: entry.teacher,
                    roomNumber: entry.roomNumber,
                    notes: entry.notes,
                };
            });

            return {
                timeSlots,
                timetable,
                classId: parseInt(classId),
                sectionId: sectionId ? parseInt(sectionId) : null,
            };
        }, 300);

        return NextResponse.json(timetableData);
    } catch (error) {
        console.error('Error fetching class timetable:', error);
        return NextResponse.json(
            { error: 'Failed to fetch class timetable' },
            { status: 500 }
        );
    }
}
