import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/schools/[schoolId]/examination/exams/[examId]/schedule
export async function POST(req, props) {
  const params = await props.params;
    try {
        const { examId } = params;
        const body = await req.json();
        const { subjectId, date, startTime, endTime, duration, maxMarks, passingMarks } = body;

        if (!subjectId) {
            return NextResponse.json(
                { error: 'Subject ID is required' },
                { status: 400 }
            );
        }

        // Check if subject is already scheduled
        const existingSchedule = await prisma.examSubject.findUnique({
            where: {
                examId_subjectId: {
                    examId: examId,
                    subjectId: parseInt(subjectId),
                },
            },
        });

        let schedule;
        if (existingSchedule) {
            // Update existing
            schedule = await prisma.examSubject.update({
                where: {
                    id: existingSchedule.id,
                },
                data: {
                    date: date ? new Date(date) : undefined,
                    startTime,
                    endTime,
                    duration: parseInt(duration),
                    maxMarks: parseFloat(maxMarks),
                    passingMarks: parseFloat(passingMarks),
                },
            });
        } else {
            // Create new
            schedule = await prisma.examSubject.create({
                data: {
                    examId: examId,
                    subjectId: parseInt(subjectId),
                    date: date ? new Date(date) : null,
                    startTime,
                    endTime,
                    duration: parseInt(duration),
                    maxMarks: parseFloat(maxMarks),
                    passingMarks: parseFloat(passingMarks),
                },
            });
        }

        return NextResponse.json(schedule);
    } catch (error) {
        console.error('Error scheduling exam subject:', error);
        return NextResponse.json(
            { error: 'Failed to schedule exam subject' },
            { status: 500 }
        );
    }
}

// DELETE /api/schools/[schoolId]/examination/exams/[examId]/schedule
export async function DELETE(req, props) {
  const params = await props.params;
    try {
        const { examId } = params;
        const { searchParams } = new URL(req.url);
        const subjectId = searchParams.get('subjectId');

        if (!subjectId) {
            return NextResponse.json(
                { error: 'Subject ID is required' },
                { status: 400 }
            );
        }

        await prisma.examSubject.delete({
            where: {
                examId_subjectId: {
                    examId: examId,
                    subjectId: parseInt(subjectId),
                },
            },
        });

        return NextResponse.json({ message: 'Subject removed from schedule' });
    } catch (error) {
        console.error('Error removing exam subject:', error);
        return NextResponse.json(
            { error: 'Failed to remove exam subject' },
            { status: 500 }
        );
    }
}
