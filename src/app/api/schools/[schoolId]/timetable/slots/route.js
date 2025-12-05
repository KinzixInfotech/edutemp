import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/timetable/slots
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;

        const slots = await prisma.timeSlot.findMany({
            where: { schoolId },
            orderBy: { sequence: 'asc' },
        });

        return NextResponse.json(slots);
    } catch (error) {
        console.error('Error fetching time slots:', error);
        return NextResponse.json(
            { error: 'Failed to fetch time slots' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/timetable/slots
export async function POST(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const { label, startTime, endTime, isBreak, sequence } = body;

        if (!label || !startTime || !endTime || sequence == null) {
            return NextResponse.json(
                { error: 'Label, start time, end time, and sequence are required' },
                { status: 400 }
            );
        }

        const slot = await prisma.timeSlot.create({
            data: {
                schoolId,
                label,
                startTime,
                endTime,
                isBreak: isBreak || false,
                sequence: parseInt(sequence),
            },
        });

        return NextResponse.json(slot);
    } catch (error) {
        console.error('Error creating time slot:', error);
        return NextResponse.json(
            { error: 'Failed to create time slot' },
            { status: 500 }
        );
    }
}
