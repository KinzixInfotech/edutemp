import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/timetable/conflicts
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        // Find teacher conflicts (same teacher, same time, same day)
        const allEntries = await prisma.timetableEntry.findMany({
            where: { schoolId, isActive: true },
            include: {
                class: { select: { className: true } },
                teacher: { select: { name: true } },
                timeSlot: { select: { label: true, startTime: true, endTime: true } },
            },
        });

        const teacherConflicts = [];
        const seen = new Map();

        allEntries.forEach((entry) => {
            const key = `${entry.teacherId}-${entry.timeSlotId}-${entry.dayOfWeek}`;
            if (seen.has(key)) {
                const existing = seen.get(key);
                teacherConflicts.push({
                    teacherName: entry.teacher.name,
                    conflictType: 'teacher',
                    entry1: {
                        id: existing.id,
                        class: existing.class.className,
                        timeSlot: existing.timeSlot.label,
                        day: existing.dayOfWeek,
                    },
                    entry2: {
                        id: entry.id,
                        class: entry.class.className,
                        timeSlot: entry.timeSlot.label,
                        day: entry.dayOfWeek,
                    },
                });
            } else {
                seen.set(key, entry);
            }
        });

        return NextResponse.json({
            conflicts: teacherConflicts,
            totalConflicts: teacherConflicts.length,
        });
    } catch (error) {
        console.error('Error checking conflicts:', error);
        return NextResponse.json(
            { error: 'Failed to check conflicts' },
            { status: 500 }
        );
    }
}
