import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const examId = searchParams.get('examId');
        const classId = searchParams.get('classId');
        const attemptId = searchParams.get('attemptId');

        const whereClause = {
            exam: {
                schoolId: schoolId
            }
        };

        if (attemptId) {
            whereClause.id = attemptId;
        }

        if (examId && examId !== 'all') {
            whereClause.examId = examId;
        }

        if (classId && classId !== 'all') {
            whereClause.student = {
                classId: parseInt(classId)
            };
        }

        const attempts = await prisma.studentExamAttempt.findMany({
            where: whereClause,
            include: {
                student: {
                    include: {
                        class: true
                    }
                },
                exam: {
                    include: {
                        questions: true
                    }
                },
                answers: true
            },
            orderBy: {
                startTime: 'desc'
            }
        });

        return NextResponse.json(attempts);

    } catch (error) {
        console.error('Error fetching online results:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
