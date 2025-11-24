import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/timetable/slots/[slotId]
export async function GET(req, { params }) {
    try {
        const { slotId } = await params;

        const slot = await prisma.timeSlot.findUnique({
            where: { id: slotId },
            include: {
                _count: {
                    select: { entries: true },
                },
            },
        });

        if (!slot) {
            return NextResponse.json(
                { error: 'Time slot not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(slot);
    } catch (error) {
        console.error('Error fetching time slot:', error);
        return NextResponse.json(
            { error: 'Failed to fetch time slot' },
            { status: 500 }
        );
    }
}

// PUT /api/schools/[schoolId]/timetable/slots/[slotId]
export async function PUT(req, { params }) {
    try {
        const { slotId } = await params;
        const body = await req.json();
        const { label, startTime, endTime, isBreak, sequence } = body;

        const slot = await prisma.timeSlot.update({
            where: { id: slotId },
            data: {
                label: label || undefined,
                startTime: startTime || undefined,
                endTime: endTime || undefined,
                isBreak: isBreak !== undefined ? isBreak : undefined,
                sequence: sequence != null ? parseInt(sequence) : undefined,
            },
        });

        return NextResponse.json(slot);
    } catch (error) {
        console.error('Error updating time slot:', error);
        return NextResponse.json(
            { error: 'Failed to update time slot' },
            { status: 500 }
        );
    }
}

// DELETE /api/schools/[schoolId]/timetable/slots/[slotId]
export async function DELETE(req, { params }) {
    try {
        const { slotId } = await params;

        // Check if slot has any entries
        const entriesCount = await prisma.timetableEntry.count({
            where: { timeSlotId: slotId },
        });

        if (entriesCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete time slot. It has ${entriesCount} timetable entries.` },
                { status: 400 }
            );
        }

        await prisma.timeSlot.delete({
            where: { id: slotId },
        });

        return NextResponse.json({ message: 'Time slot deleted successfully' });
    } catch (error) {
        console.error('Error deleting time slot:', error);
        return NextResponse.json(
            { error: 'Failed to delete time slot' },
            { status: 500 }
        );
    }
}
