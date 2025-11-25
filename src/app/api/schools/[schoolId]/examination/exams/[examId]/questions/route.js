import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/examination/exams/[examId]/questions
export async function GET(req, { params }) {
    try {
        const { examId } = await params;

        const questions = await prisma.onlineExamQuestion.findMany({
            where: { examId: examId },
            orderBy: { order: 'asc' },
        });

        return NextResponse.json(questions);
    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch questions' },
            { status: 500 }
        );
    }
}

// PUT /api/schools/[schoolId]/examination/exams/[examId]/questions
// Replaces/Updates questions list
export async function PUT(req, { params }) {
    try {
        const { examId } = await params;
        const body = await req.json();
        const { questions } = body; // Expecting array of questions

        if (!Array.isArray(questions)) {
            return NextResponse.json(
                { error: 'Questions must be an array' },
                { status: 400 }
            );
        }

        // Transaction to handle updates
        await prisma.$transaction(async (tx) => {
            // 1. Delete existing questions that are not in the new list (if we want to support partial updates, but here we replace logic)
            // But to be safe and simple for "Google Docs" style which might just send the current state:
            // We can delete all and recreate, OR upsert.
            // Deleting all is risky if there are answers.
            // Check if exam has attempts.

            const attemptsCount = await tx.studentExamAttempt.count({
                where: { examId: examId }
            });

            if (attemptsCount > 0) {
                throw new Error('Cannot modify questions after exam has been attempted');
            }

            // Delete all existing questions
            await tx.onlineExamQuestion.deleteMany({
                where: { examId: examId }
            });

            // Create new questions
            if (questions.length > 0) {
                await tx.onlineExamQuestion.createMany({
                    data: questions.map((q, index) => ({
                        examId: examId,
                        question: q.question,
                        type: q.type,
                        options: q.options || [],
                        correctAnswer: q.correctAnswer || null,
                        marks: parseFloat(q.marks) || 0,
                        order: index,
                    }))
                });
            }
        });

        const updatedQuestions = await prisma.onlineExamQuestion.findMany({
            where: { examId: examId },
            orderBy: { order: 'asc' },
        });

        return NextResponse.json(updatedQuestions);
    } catch (error) {
        console.error('Error updating questions:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update questions' },
            { status: 500 }
        );
    }
}
