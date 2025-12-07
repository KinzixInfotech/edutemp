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

        // Send notification to parents of students in this class
        try {
            await sendNotification({
                schoolId,
                title: '📅 Timetable Updated',
                message: `Timetable for ${entry.class.className}${entry.section ? ' - ' + entry.section.name : ''} has been updated.`,
                type: 'GENERAL',
                priority: 'NORMAL',
                icon: '📅',
                targetOptions: {
                    classIds: [parseInt(classId)],
                    userTypes: ['STUDENT'],
                    includeParents: true,
                },
                sendPush: true,
                actionUrl: '/my-child/parent-timetable',
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
