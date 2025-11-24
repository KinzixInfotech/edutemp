import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/examination/exams/[examId]
export async function GET(req, { params }) {
    try {
        const { examId } = await params;

        const exam = await prisma.exam.findUnique({
            where: { id: parseInt(examId) },
            include: {
                academicYear: true,
                classes: true,
                subjects: {
                    include: {
                        subject: true,
                    },
                    orderBy: {
                        date: 'asc',
                    },
                },
            },
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        return NextResponse.json(exam);
    } catch (error) {
        console.error('Error fetching exam:', error);
        return NextResponse.json(
            { error: 'Failed to fetch exam' },
            { status: 500 }
        );
    }
}

// PUT /api/schools/[schoolId]/examination/exams/[examId]
export async function PUT(req, { params }) {
    try {
        const { examId } = await params;
        const body = await req.json();
        const { title, type, startDate, endDate, status, classIds } = body;

        const exam = await prisma.exam.update({
            where: { id: parseInt(examId) },
            data: {
                title,
                type,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status,
                classes: classIds
                    ? {
                        set: classIds.map((id) => ({ id: parseInt(id) })),
                    }
                    : undefined,
            },
        });

        return NextResponse.json(exam);
    } catch (error) {
        console.error('Error updating exam:', error);
        return NextResponse.json(
            { error: 'Failed to update exam' },
            { status: 500 }
        );
    }
}

// DELETE /api/schools/[schoolId]/examination/exams/[examId]
export async function DELETE(req, { params }) {
    try {
        const { examId } = await params;

        await prisma.exam.delete({
            where: { id: parseInt(examId) },
        });

        return NextResponse.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Error deleting exam:', error);
        return NextResponse.json(
            { error: 'Failed to delete exam' },
            { status: 500 }
        );
    }
}
