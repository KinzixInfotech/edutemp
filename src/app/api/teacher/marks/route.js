import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { remember, generateKey, delCache } from '@/lib/cache';

// Middleware to validate teacher session
async function validateTeacherSession(req) {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) return { error: 'Unauthorized', status: 401 };

    const sessionStr = await redis.get(`teacher:session:${token}`);
    if (!sessionStr) return { error: 'Session expired', status: 401 };

    const session = typeof sessionStr === 'string' ? JSON.parse(sessionStr) : sessionStr;
    if (new Date(session.expiresAt) < new Date()) return { error: 'Session expired', status: 401 };

    return { session, token };
}

// Validate teacher has access to this exam/subject/class
async function validateAccess(teacherId, examId, subjectId, classId) {
    const assignment = await prisma.examEvaluator.findFirst({
        where: {
            teacherId,
            examId,
            subjectId: parseInt(subjectId),
            classId: parseInt(classId)
        }
    });
    return !!assignment;
}

// GET - Fetch marks for a specific exam/subject/class
export async function GET(req) {
    try {
        const validation = await validateTeacherSession(req);
        if (validation.error) {
            return NextResponse.json({ error: validation.error }, { status: validation.status });
        }

        const { session } = validation;
        const { searchParams } = new URL(req.url);
        const examId = searchParams.get('examId');
        const subjectId = searchParams.get('subjectId');
        const classId = searchParams.get('classId');

        if (!examId || !subjectId || !classId) {
            return NextResponse.json({ error: 'examId, subjectId, and classId are required' }, { status: 400 });
        }

        // Validate teacher has access
        const hasAccess = await validateAccess(session.teacherId, examId, subjectId, classId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'You are not assigned to this subject/class' }, { status: 403 });
        }

        const cacheKey = generateKey('teacher-marks', { examId, subjectId, classId });

        const result = await remember(cacheKey, async () => {
            // Get exam details
            const exam = await prisma.exam.findUnique({
                where: { id: examId },
                select: { id: true, title: true, status: true }
            });

            // Get exam subject for max marks
            const examSubject = await prisma.examSubject.findUnique({
                where: { examId_subjectId: { examId, subjectId: parseInt(subjectId) } },
                select: { maxMarks: true, passingMarks: true }
            });

            // Get subject and class info
            const subject = await prisma.subject.findUnique({
                where: { id: parseInt(subjectId) },
                select: { id: true, subjectName: true }
            });

            const classInfo = await prisma.class.findUnique({
                where: { id: parseInt(classId) },
                select: { id: true, className: true }
            });

            // Get students in this class
            const students = await prisma.student.findMany({
                where: { classId: parseInt(classId), schoolId: session.schoolId },
                select: {
                    userId: true,
                    name: true,
                    rollNumber: true,
                    admissionNo: true
                },
                orderBy: { rollNumber: 'asc' }
            });

            // Get existing marks
            const marks = await prisma.examResult.findMany({
                where: {
                    examId,
                    subjectId: parseInt(subjectId),
                    studentId: { in: students.map(s => s.userId) }
                }
            });

            // Get submission status
            const submission = await prisma.marksSubmission.findUnique({
                where: {
                    examId_subjectId_classId: {
                        examId,
                        subjectId: parseInt(subjectId),
                        classId: parseInt(classId)
                    }
                }
            });

            // Combine students with marks
            const studentMarks = students.map(student => {
                const mark = marks.find(m => m.studentId === student.userId);
                return {
                    studentId: student.userId,
                    name: student.name,
                    rollNumber: student.rollNumber,
                    admissionNo: student.admissionNo,
                    marksObtained: mark?.marksObtained ?? '',
                    grade: mark?.grade ?? '',
                    remarks: mark?.remarks ?? '',
                    isAbsent: mark?.isAbsent ?? false
                };
            });

            return {
                exam,
                subject,
                class: classInfo,
                maxMarks: examSubject?.maxMarks || 100,
                passingMarks: examSubject?.passingMarks || 33,
                students: studentMarks,
                submission: submission || { status: 'DRAFT' },
                isLocked: submission?.status === 'LOCKED' || submission?.status === 'PUBLISHED'
            };
        }, 60); // Cache 1 minute

        return NextResponse.json(result);

    } catch (error) {
        console.error('[TEACHER MARKS GET ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch marks' }, { status: 500 });
    }
}

// POST - Save marks (as draft)
export async function POST(req) {
    try {
        const validation = await validateTeacherSession(req);
        if (validation.error) {
            return NextResponse.json({ error: validation.error }, { status: validation.status });
        }

        const { session } = validation;
        const body = await req.json();
        const { examId, subjectId, classId, marks } = body;

        if (!examId || !subjectId || !classId || !Array.isArray(marks)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Validate access
        const hasAccess = await validateAccess(session.teacherId, examId, subjectId, classId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'You are not assigned to this subject/class' }, { status: 403 });
        }

        // Check if locked
        const submission = await prisma.marksSubmission.findUnique({
            where: {
                examId_subjectId_classId: {
                    examId,
                    subjectId: parseInt(subjectId),
                    classId: parseInt(classId)
                }
            }
        });

        if (submission?.status === 'LOCKED' || submission?.status === 'PUBLISHED') {
            return NextResponse.json({ error: 'Marks are locked. Contact admin to unlock.' }, { status: 403 });
        }

        // Save marks using transaction
        await prisma.$transaction(
            marks.map(mark =>
                prisma.examResult.upsert({
                    where: {
                        examId_studentId_subjectId: {
                            examId,
                            studentId: mark.studentId,
                            subjectId: parseInt(subjectId)
                        }
                    },
                    update: {
                        marksObtained: mark.marksObtained !== '' ? parseFloat(mark.marksObtained) : null,
                        grade: mark.grade || null,
                        remarks: mark.remarks || null,
                        isAbsent: mark.isAbsent || false
                    },
                    create: {
                        examId,
                        studentId: mark.studentId,
                        subjectId: parseInt(subjectId),
                        marksObtained: mark.marksObtained !== '' ? parseFloat(mark.marksObtained) : null,
                        grade: mark.grade || null,
                        remarks: mark.remarks || null,
                        isAbsent: mark.isAbsent || false
                    }
                })
            )
        );

        // Ensure MarksSubmission exists with DRAFT status
        await prisma.marksSubmission.upsert({
            where: {
                examId_subjectId_classId: { examId, subjectId: parseInt(subjectId), classId: parseInt(classId) }
            },
            update: {}, // Keep current status
            create: {
                examId,
                subjectId: parseInt(subjectId),
                classId: parseInt(classId),
                status: 'DRAFT'
            }
        });

        // Invalidate cache
        await delCache(generateKey('teacher-marks', { examId, subjectId, classId }));

        return NextResponse.json({ success: true, message: 'Marks saved as draft' });

    } catch (error) {
        console.error('[TEACHER MARKS POST ERROR]', error);
        return NextResponse.json({ error: 'Failed to save marks' }, { status: 500 });
    }
}

// PATCH - Submit marks (change status to SUBMITTED)
export async function PATCH(req) {
    try {
        const validation = await validateTeacherSession(req);
        if (validation.error) {
            return NextResponse.json({ error: validation.error }, { status: validation.status });
        }

        const { session } = validation;
        const body = await req.json();
        const { examId, subjectId, classId, action } = body;

        if (!examId || !subjectId || !classId || !action) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        // Validate access
        const hasAccess = await validateAccess(session.teacherId, examId, subjectId, classId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'You are not assigned to this subject/class' }, { status: 403 });
        }

        if (action === 'SUBMIT') {
            // Check current status
            const submission = await prisma.marksSubmission.findUnique({
                where: {
                    examId_subjectId_classId: { examId, subjectId: parseInt(subjectId), classId: parseInt(classId) }
                }
            });

            if (submission?.status === 'LOCKED' || submission?.status === 'PUBLISHED') {
                return NextResponse.json({ error: 'Already submitted and locked' }, { status: 400 });
            }

            // Update to SUBMITTED
            await prisma.marksSubmission.upsert({
                where: {
                    examId_subjectId_classId: { examId, subjectId: parseInt(subjectId), classId: parseInt(classId) }
                },
                update: {
                    status: 'SUBMITTED',
                    submittedBy: session.teacherId,
                    submittedAt: new Date()
                },
                create: {
                    examId,
                    subjectId: parseInt(subjectId),
                    classId: parseInt(classId),
                    status: 'SUBMITTED',
                    submittedBy: session.teacherId,
                    submittedAt: new Date()
                }
            });

            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId: session.teacherId,
                    action: 'UPDATE',
                    tableName: 'MarksSubmission',
                    rowId: `${examId}-${subjectId}-${classId}`,
                    newData: { action: 'SUBMITTED' }
                }
            });

            // Invalidate caches
            await delCache(generateKey('teacher-marks', { examId, subjectId, classId }));
            await delCache(generateKey('teacher-exams', { teacherId: session.teacherId, schoolId: session.schoolId }));

            return NextResponse.json({ success: true, message: 'Marks submitted successfully. You cannot edit without admin approval.' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[TEACHER MARKS PATCH ERROR]', error);
        return NextResponse.json({ error: 'Failed to submit marks' }, { status: 500 });
    }
}
