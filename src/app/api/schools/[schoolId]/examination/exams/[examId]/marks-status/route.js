import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId, examId } = params;

        // Define the cache key
        const cacheKey = generateKey('marks_status', { schoolId, examId });

        // Use remember() to fetch from cache or execute logic
        const responseData = await remember(cacheKey, async () => {
            // 1. Fetch all evaluators assigned for this exam
            const evaluators = await prisma.examEvaluator.findMany({
                where: {
                    examId,
                    exam: {
                        schoolId: schoolId
                    }
                },
                include: {
                    teacher: {
                        select: {
                            name: true,
                            email: true,
                            employeeId: true
                        }
                    },
                    subject: {
                        select: {
                            subjectName: true
                        }
                    },
                    class: {
                        select: {
                            className: true
                        }
                    }
                }
            });

            // 2. Fetch all marks submissions for this exam
            const submissions = await prisma.marksSubmission.findMany({
                where: {
                    examId
                }
            });

            // 3. Map submissions to evaluators to determine status
            const statusData = evaluators.map(evaluator => {
                // Find matching submission
                const submission = submissions.find(
                    s => s.subjectId === evaluator.subjectId && s.classId === evaluator.classId
                );

                return {
                    id: evaluator.id,
                    subjectName: evaluator.subject.subjectName,
                    className: evaluator.class.className,
                    teacherName: evaluator.teacher.name,
                    teacherId: evaluator.teacherId,
                    status: submission ? submission.status : 'PENDING',
                    submittedAt: submission?.submittedAt || null,
                    submittedBy: submission?.submittedBy || null,
                    lastUpdated: submission?.updatedAt || null
                };
            });

            return {
                total: evaluators.length,
                submitted: statusData.filter(s => s.status === 'SUBMITTED' || s.status === 'PUBLISHED').length,
                statusData
            };
        }, 300); // Cache for 5 minutes (300 seconds) as marks status updates frequently during exams

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('[MARKS_STATUS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
