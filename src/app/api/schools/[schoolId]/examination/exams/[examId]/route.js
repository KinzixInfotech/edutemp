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
                school: true,
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
                securitySettings: body.securitySettings !== undefined ? body.securitySettings : undefined,
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
        const id = parseInt(examId);

        // Delete all related records in proper order to avoid foreign key constraints
        await prisma.$transaction(async (tx) => {
            // Delete hall attendance records
            await tx.hallAttendance.deleteMany({
                where: { examId: id }
            });

            // Delete student exam attempts
            await tx.studentExamAttempt.deleteMany({
                where: { examId: id }
            });

            // Delete online exam questions
            await tx.onlineExamQuestion.deleteMany({
                where: { examId: id }
            });

            // Delete seat allocations
            await tx.seatAllocation.deleteMany({
                where: { examId: id }
            });

            // Delete exam results
            await tx.examResult.deleteMany({
                where: { examId: id }
            });

            // Delete exam subjects
            await tx.examSubject.deleteMany({
                where: { examId: id }
            });

            // Delete hall invigilators
            await tx.examHallInvigilator.deleteMany({
                where: { examId: id }
            });

            // Finally, delete the exam
            await tx.exam.delete({
                where: { id }
            });
        });

        return NextResponse.json({ message: 'Exam deleted successfully' });
    } catch (error) {
        console.error('Error deleting exam:', error);
        return NextResponse.json(
            { error: 'Failed to delete exam. Please try again.' },
            { status: 500 }
        );
    }
}
