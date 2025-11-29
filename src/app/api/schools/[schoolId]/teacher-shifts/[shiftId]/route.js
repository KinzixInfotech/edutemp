import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE /api/schools/[schoolId]/teacher-shifts/[shiftId]
export async function DELETE(req, { params }) {
    try {
        const { schoolId, shiftId } = await params;

        const shift = await prisma.teacherShift.findUnique({
            where: {
                id: shiftId,
                schoolId,
            },
        });

        if (!shift) {
            return NextResponse.json(
                { error: 'Shift not found' },
                { status: 404 }
            );
        }

        await prisma.teacherShift.delete({
            where: {
                id: shiftId,
            },
        });

        return NextResponse.json({ message: 'Shift deleted successfully' });
    } catch (error) {
        console.error('Error deleting teacher shift:', error);
        return NextResponse.json(
            { error: 'Failed to delete teacher shift' },
            { status: 500 }
        );
    }
}

// PUT /api/schools/[schoolId]/teacher-shifts/[shiftId]
export async function PUT(req, { params }) {
    try {
        const { schoolId, shiftId } = await params;
        const body = await req.json();
        const { classId, sectionId, subjectId, teacherId, timeSlotId, date, roomNumber, notes, status } = body;

        const existingShift = await prisma.teacherShift.findUnique({
            where: {
                id: shiftId,
                schoolId,
            },
        });

        if (!existingShift) {
            return NextResponse.json(
                { error: 'Shift not found' },
                { status: 404 }
            );
        }

        // If date or timeSlot is changing, check for conflicts
        if (date || timeSlotId) {
            const shiftDate = date ? new Date(date) : existingShift.date;
            const shiftTimeSlotId = timeSlotId || existingShift.timeSlotId;
            const shiftTeacherId = teacherId || existingShift.teacherId;
            const shiftClassId = classId ? parseInt(classId) : existingShift.classId;
            const shiftSectionId = sectionId !== undefined ? (sectionId ? parseInt(sectionId) : null) : existingShift.sectionId;

            // 1. Teacher Conflict
            const teacherConflict = await prisma.teacherShift.findFirst({
                where: {
                    teacherId: shiftTeacherId,
                    timeSlotId: shiftTimeSlotId,
                    date: shiftDate,
                    schoolId,
                    NOT: {
                        id: shiftId,
                    },
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
                        message: `Teacher is already assigned to ${teacherConflict.class.className} at ${teacherConflict.timeSlot.label} on this date`,
                    },
                    { status: 409 }
                );
            }

            // 2. Class Conflict
            const classConflict = await prisma.teacherShift.findFirst({
                where: {
                    classId: shiftClassId,
                    sectionId: shiftSectionId,
                    timeSlotId: shiftTimeSlotId,
                    date: shiftDate,
                    schoolId,
                    NOT: {
                        id: shiftId,
                    },
                },
            });

            if (classConflict) {
                return NextResponse.json(
                    {
                        error: 'Class conflict',
                        message: 'This class/section already has a subject at this time on this date',
                    },
                    { status: 409 }
                );
            }
        }

        const updatedShift = await prisma.teacherShift.update({
            where: {
                id: shiftId,
            },
            data: {
                ...(classId && { classId: parseInt(classId) }),
                ...(sectionId !== undefined && { sectionId: sectionId ? parseInt(sectionId) : null }),
                ...(subjectId && { subjectId: parseInt(subjectId) }),
                ...(teacherId && { teacherId }),
                ...(timeSlotId && { timeSlotId }),
                ...(date && { date: new Date(date) }),
                ...(roomNumber !== undefined && { roomNumber }),
                ...(notes !== undefined && { notes }),
                ...(status && { status }),
            },
            include: {
                class: { select: { className: true } },
                section: { select: { name: true } },
                subject: { select: { subjectName: true } },
                teacher: { select: { name: true } },
                timeSlot: { select: { label: true, startTime: true, endTime: true } },
            },
        });

        return NextResponse.json(updatedShift);
    } catch (error) {
        console.error('Error updating teacher shift:', error);
        return NextResponse.json(
            { error: 'Failed to update teacher shift' },
            { status: 500 }
        );
    }
}
