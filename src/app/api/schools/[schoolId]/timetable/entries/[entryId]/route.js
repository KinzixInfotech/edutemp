import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// GET /api/schools/[schoolId]/timetable/entries/[entryId]
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { entryId } = params;

        const entry = await prisma.timetableEntry.findUnique({
            where: { id: entryId },
            include: {
                class: true,
                section: true,
                subject: true,
                teacher: true,
                timeSlot: true,
            },
        });

        if (!entry) {
            return NextResponse.json(
                { error: 'Timetable entry not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(entry);
    } catch (error) {
        console.error('Error fetching timetable entry:', error);
        return NextResponse.json(
            { error: 'Failed to fetch timetable entry' },
            { status: 500 }
        );
    }
}

// PUT /api/schools/[schoolId]/timetable/entries/[entryId]
export async function PUT(req, props) {
    const params = await props.params;
    try {
        const { entryId } = params;
        const body = await req.json();
        const { subjectId, teacherId, timeSlotId, dayOfWeek, roomNumber, notes, isActive } = body;

        const entry = await prisma.timetableEntry.update({
            where: { id: entryId },
            data: {
                subjectId: subjectId ? parseInt(subjectId) : undefined,
                teacherId: teacherId || undefined,
                timeSlotId: timeSlotId || undefined,
                dayOfWeek: dayOfWeek != null ? parseInt(dayOfWeek) : undefined,
                roomNumber: roomNumber !== undefined ? roomNumber : undefined,
                notes: notes !== undefined ? notes : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            },
            include: {
                class: { select: { className: true } },
                section: { select: { name: true } },
                subject: { select: { subjectName: true } },
                teacher: { select: { name: true } },
                timeSlot: { select: { label: true } },
            },
        });

        // Send notification to parents of students in this class
        try {
            await sendNotification({
                schoolId: entry.schoolId,
                title: '📅 Timetable Updated',
                message: `Timetable for ${entry.class.className}${entry.section ? ' - ' + entry.section.name : ''} has been updated.`,
                type: 'GENERAL',
                priority: 'NORMAL',
                icon: '📅',
                targetOptions: {
                    classIds: [entry.classId],
                    userTypes: ['STUDENT'],
                    includeParents: true,
                },
                sendPush: true,
                actionUrl: '/my-child/parent-timetable',
            });
        } catch (notifErr) {
            console.warn('Timetable update notification failed:', notifErr.message);
        }

        return NextResponse.json(entry);
    } catch (error) {
        console.error('Error updating timetable entry:', error);
        return NextResponse.json(
            { error: 'Failed to update timetable entry' },
            { status: 500 }
        );
    }
}

// DELETE /api/schools/[schoolId]/timetable/entries/[entryId]
export async function DELETE(req, props) {
    const params = await props.params;
    try {
        const { entryId } = params;

        await prisma.timetableEntry.delete({
            where: { id: entryId },
        });

        return NextResponse.json({ message: 'Timetable entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting timetable entry:', error);
        return NextResponse.json(
            { error: 'Failed to delete timetable entry' },
            { status: 500 }
        );
    }
}
