import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { remember, generateKey } from '@/lib/cache';

// Middleware to validate teacher session
async function validateTeacherSession(req) {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return { error: 'Unauthorized', status: 401 };
    }

    const sessionStr = await redis.get(`teacher:session:${token}`);
    if (!sessionStr) {
        return { error: 'Session expired', status: 401 };
    }

    const session = typeof sessionStr === 'string' ? JSON.parse(sessionStr) : sessionStr;

    if (new Date(session.expiresAt) < new Date()) {
        return { error: 'Session expired', status: 401 };
    }

    return { session };
}

// GET - Fetch exams assigned to the logged-in teacher
export async function GET(req) {
    try {
        const validation = await validateTeacherSession(req);
        if (validation.error) {
            return NextResponse.json({ error: validation.error }, { status: validation.status });
        }

        const { session } = validation;
        const { teacherId, schoolId, academicYearId } = session;

        const cacheKey = generateKey('teacher-exams', { teacherId, schoolId, academicYearId });

        const result = await remember(cacheKey, async () => {
            // Get exams where this teacher is assigned as evaluator
            const evaluatorAssignments = await prisma.examEvaluator.findMany({
                where: { teacherId },
                include: {
                    exam: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                            status: true,
                            startDate: true,
                            endDate: true,
                            academicYear: { select: { id: true, name: true } },
                            classes: { select: { id: true, className: true } }
                        }
                    },
                    subject: {
                        select: { id: true, subjectName: true }
                    },
                    class: {
                        select: { id: true, className: true }
                    }
                },
                orderBy: { exam: { startDate: 'desc' } }
            });

            // Group by exam
            const examsMap = new Map();

            for (const assignment of evaluatorAssignments) {
                const examId = assignment.examId;

                if (!examsMap.has(examId)) {
                    examsMap.set(examId, {
                        ...assignment.exam,
                        assignments: []
                    });
                }

                examsMap.get(examId).assignments.push({
                    id: assignment.id,
                    subject: assignment.subject,
                    class: assignment.class,
                    assignedAt: assignment.assignedAt
                });
            }

            const exams = Array.from(examsMap.values());

            // Get marks submission status for each assignment
            for (const exam of exams) {
                for (const assignment of exam.assignments) {
                    const submission = await prisma.marksSubmission.findUnique({
                        where: {
                            examId_subjectId_classId: {
                                examId: exam.id,
                                subjectId: assignment.subject.id,
                                classId: assignment.class.id
                            }
                        },
                        select: { status: true, submittedAt: true, lockedAt: true }
                    });

                    assignment.marksStatus = submission?.status || 'DRAFT';
                    assignment.submittedAt = submission?.submittedAt;
                    assignment.isLocked = submission?.status === 'LOCKED' || submission?.status === 'PUBLISHED';
                }
            }

            return {
                exams,
                summary: {
                    total: exams.length,
                    pending: exams.filter(e => e.assignments.some(a => a.marksStatus === 'DRAFT')).length,
                    submitted: exams.filter(e => e.assignments.every(a => a.marksStatus !== 'DRAFT')).length
                }
            };
        }, 120); // Cache for 2 minutes

        return NextResponse.json(result);

    } catch (error) {
        console.error('[TEACHER EXAMS ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
    }
}
