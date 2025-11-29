import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/teacher-shifts
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const teacherId = searchParams.get('teacherId');
        const classId = searchParams.get('classId');

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Start date and end date are required' },
                { status: 400 }
            );
        }

        const where = {
            schoolId,
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
            ...(teacherId && { teacherId }),
            ...(classId && { classId: parseInt(classId) }),
        };

        const shifts = await prisma.teacherShift.findMany({
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
                { date: 'asc' },
                { timeSlot: { sequence: 'asc' } },
            ],
        });

        return NextResponse.json(shifts);
    } catch (error) {
        console.error('Error fetching teacher shifts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch teacher shifts' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/teacher-shifts
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        const { classId, sectionId, subjectId, teacherId, timeSlotId, date, roomNumber, notes } = body;

        if (!classId || !subjectId || !teacherId || !timeSlotId || !date) {
            return NextResponse.json(
                { error: 'Class, subject, teacher, time slot, and date are required' },
                { status: 400 }
            );
        }

        const shiftDate = new Date(date);

        // Check for conflicts
        // 1. Same teacher, same time, same date
        const teacherConflict = await prisma.teacherShift.findFirst({
            where: {
                teacherId,
                timeSlotId,
                date: shiftDate,
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
                    message: `Teacher is already assigned to ${teacherConflict.class.className} at ${teacherConflict.timeSlot.label} on this date`,
                },
                { status: 409 }
            );
        }

        // 2. Same class/section, same time, same date
        const classConflict = await prisma.teacherShift.findFirst({
            where: {
                classId: parseInt(classId),
                sectionId: sectionId ? parseInt(sectionId) : null,
                timeSlotId,
                date: shiftDate,
                schoolId,
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

        const shift = await prisma.teacherShift.create({
            data: {
                schoolId,
                classId: parseInt(classId),
                sectionId: sectionId ? parseInt(sectionId) : null,
                subjectId: parseInt(subjectId),
                teacherId,
                timeSlotId,
                date: shiftDate,
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

        return NextResponse.json(shift);
    } catch (error) {
        console.error('Error creating teacher shift:', error);
        return NextResponse.json(
            { error: 'Failed to create teacher shift', details: error.message },
            { status: 500 }
        );
    }
}
