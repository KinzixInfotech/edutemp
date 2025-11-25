import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Start Attempt
export async function POST(req, { params }) {
    try {
        const { examId } = await params;
        const body = await req.json();
        const { studentId } = body;

        if (!studentId) {
            return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
        }

        // Check if exam exists and is active
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: { questions: true }
        });

        if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        // Check if online
        if (exam.type !== 'ONLINE') {
            return NextResponse.json({ error: 'This is not an online exam' }, { status: 400 });
        }

        // Check dates
        const now = new Date();
        if (exam.startDate && now < exam.startDate) {
            return NextResponse.json({ error: 'Exam has not started yet' }, { status: 400 });
        }
        if (exam.endDate && now > exam.endDate) {
            return NextResponse.json({ error: 'Exam has ended' }, { status: 400 });
        }

        // Check existing attempt
        const existingAttempt = await prisma.studentExamAttempt.findFirst({
            where: {
                examId: examId,
                studentId: studentId
            }
        });

        if (existingAttempt) {
            if (existingAttempt.status === 'COMPLETED' || existingAttempt.status === 'TERMINATED') {
                return NextResponse.json({ error: 'You have already attempted this exam' }, { status: 400 });
            }
            // If IN_PROGRESS, resume it
            return NextResponse.json({
                attemptId: existingAttempt.id,
                questions: exam.questions.map(q => ({
                    id: q.id,
                    question: q.question,
                    type: q.type,
                    options: q.options,
                    marks: q.marks,
                    order: q.order
                    // Exclude correctAnswer
                })),
                startTime: existingAttempt.startTime,
                securitySettings: exam.securitySettings,
                exam: {
                    enableTimer: exam.enableTimer,
                    duration: exam.duration,
                    securitySettings: exam.securitySettings
                }
            });
        }

        // Create new attempt
        const attempt = await prisma.studentExamAttempt.create({
            data: {
                examId: examId,
                studentId: studentId,
                status: 'IN_PROGRESS',
                startTime: new Date(),
            }
        });

        return NextResponse.json({
            attemptId: attempt.id,
            questions: exam.questions.map(q => ({
                id: q.id,
                question: q.question,
                type: q.type,
                options: q.options,
                marks: q.marks,
                order: q.order
            })),
            startTime: attempt.startTime,
            securitySettings: exam.securitySettings,
            exam: {
                enableTimer: exam.enableTimer,
                duration: exam.duration,
                securitySettings: exam.securitySettings
            }
        });

    } catch (error) {
        console.error('Error starting attempt:', error);
        return NextResponse.json({ error: 'Failed to start attempt' }, { status: 500 });
    }
}

// PUT: Submit Attempt
export async function PUT(req, { params }) {
    try {
        const { examId } = await params;
        const body = await req.json();
        const { attemptId, answers, securityViolations, finish } = body;

        if (!attemptId) return NextResponse.json({ error: 'Attempt ID required' }, { status: 400 });

        // Fetch attempt and exam questions
        const attempt = await prisma.studentExamAttempt.findUnique({
            where: { id: attemptId },
            include: { exam: { include: { questions: true } } }
        });

        if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
        if (attempt.status !== 'IN_PROGRESS') return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 });

        // Update security violations if any
        if (securityViolations) {
            await prisma.studentExamAttempt.update({
                where: { id: attemptId },
                data: { securityViolations }
            });
        }

        // If finishing, calculate score
        if (finish) {
            let totalScore = 0;
            const answerData = [];

            if (answers && Array.isArray(answers)) {
                for (const ans of answers) {
                    const question = attempt.exam.questions.find(q => q.id === ans.questionId);
                    let isCorrect = false;
                    let marksObtained = 0;

                    if (question) {
                        // Simple auto-grading for MCQ/Checkbox
                        if (question.type === 'MCQ' || question.type === 'CHECKBOX') {
                            // Normalize both to arrays for comparison
                            const studentAns = Array.isArray(ans.answer) ? ans.answer : [ans.answer];
                            const correctAns = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];

                            // Sort and compare strings
                            const sortedStudent = studentAns.map(String).sort();
                            const sortedCorrect = correctAns.map(String).sort();

                            if (JSON.stringify(sortedStudent) === JSON.stringify(sortedCorrect)) {
                                isCorrect = true;
                                marksObtained = question.marks;
                            }
                        }
                    }

                    totalScore += marksObtained;

                    answerData.push({
                        attemptId: attemptId,
                        questionId: ans.questionId,
                        answer: ans.answer,
                        isCorrect,
                        marksObtained
                    });
                }

                // Save answers
                if (answerData.length > 0) {
                    await prisma.studentExamAnswer.createMany({
                        data: answerData
                    });
                }
            }

            // Update attempt status
            await prisma.studentExamAttempt.update({
                where: { id: attemptId },
                data: {
                    status: 'COMPLETED',
                    endTime: new Date(),
                    score: totalScore
                }
            });

            return NextResponse.json({ success: true, score: totalScore });
        } else {
            // Just save progress (optional, maybe just return success)
            return NextResponse.json({ success: true });
        }

    } catch (error) {
        console.error('Error submitting attempt:', error);
        return NextResponse.json({ error: 'Failed to submit attempt' }, { status: 500 });
    }
}
