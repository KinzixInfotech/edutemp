// app/api/schools/[schoolId]/examination/exams/[examId]/evaluators/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, delCache, generateKey } from '@/lib/cache';
import { notifyEvaluatorAssigned } from '@/lib/notifications/notificationHelper';

// GET - List evaluators for an exam
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const cacheKey = generateKey('exam-evaluators', { schoolId, examId });

        const evaluators = await remember(cacheKey, async () => {
            return await prisma.examEvaluator.findMany({
                where: { examId },
                include: {
                    teacher: {
                        select: {
                            userId: true,
                            name: true,
                            employeeId: true,
                            designation: true,
                            user: { select: { profilePicture: true } }
                        }
                    },
                    subject: {
                        select: { id: true, subjectName: true }
                    },
                    class: {
                        select: { id: true, className: true }
                    }
                },
                orderBy: [
                    { class: { className: 'asc' } },
                    { subject: { subjectName: 'asc' } }
                ]
            });
        }, 180); // Cache for 3 minutes

        // Group by class for easier display
        const grouped = evaluators.reduce((acc, ev) => {
            const classId = ev.classId;
            if (!acc[classId]) {
                acc[classId] = {
                    classId,
                    className: ev.class?.className,
                    subjects: []
                };
            }
            acc[classId].subjects.push({
                id: ev.id,
                subjectId: ev.subjectId,
                subjectName: ev.subject?.subjectName,
                teacher: ev.teacher,
                assignedAt: ev.assignedAt
            });
            return acc;
        }, {});

        return NextResponse.json({
            evaluators,
            grouped: Object.values(grouped),
            total: evaluators.length
        });
    } catch (error) {
        console.error('Evaluators fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch evaluators' }, { status: 500 });
    }
}

// POST - Assign evaluator to exam/subject/class
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const body = await req.json();
        const { teacherId, subjectId, classId, assignedBy } = body;

        if (!teacherId || !subjectId || !classId || !assignedBy) {
            return NextResponse.json(
                { error: 'teacherId, subjectId, classId, and assignedBy are required' },
                { status: 400 }
            );
        }

        // Verify teacher exists in this school
        const teacher = await prisma.teachingStaff.findFirst({
            where: { userId: teacherId, schoolId }
        });

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        // Verify exam exists and get exam details for notification
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            select: {
                schoolId: true,
                status: true,
                title: true,
                startDate: true,
                endDate: true
            }
        });

        if (!exam || exam.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        // Create evaluator assignment
        const evaluator = await prisma.examEvaluator.upsert({
            where: {
                examId_teacherId_subjectId_classId: {
                    examId,
                    teacherId,
                    subjectId: parseInt(subjectId),
                    classId: parseInt(classId)
                }
            },
            update: {
                assignedBy,
                assignedAt: new Date()
            },
            create: {
                examId,
                teacherId,
                subjectId: parseInt(subjectId),
                classId: parseInt(classId),
                assignedBy
            },
            include: {
                teacher: { select: { name: true, employeeId: true } },
                subject: { select: { subjectName: true } },
                class: { select: { className: true } }
            }
        });

        // Invalidate cache
        const cacheKey = generateKey('exam-evaluators', { schoolId, examId });
        await delCache(cacheKey);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId: assignedBy,
                action: 'CREATE',
                tableName: 'ExamEvaluator',
                rowId: evaluator.id,
                newData: {
                    examId,
                    teacherId,
                    subjectId,
                    classId,
                    teacherName: evaluator.teacher?.name,
                    subjectName: evaluator.subject?.subjectName,
                    className: evaluator.class?.className
                }
            }
        });

        // Send push notification to the assigned teacher
        // Using non-blocking notification (don't await to not delay response)
        notifyEvaluatorAssigned({
            schoolId,
            teacherId,
            examTitle: exam.title,
            subjectName: evaluator.subject?.subjectName,
            className: evaluator.class?.className,
            examId,
            senderId: assignedBy
        }).catch(err => {
            console.error('Failed to send evaluator notification:', err);
        });

        return NextResponse.json({
            success: true,
            message: `${evaluator.teacher?.name} assigned as evaluator for ${evaluator.subject?.subjectName} in ${evaluator.class?.className}`,
            evaluator
        });
    } catch (error) {
        console.error('Evaluator assignment error:', error);
        return NextResponse.json({ error: 'Failed to assign evaluator' }, { status: 500 });
    }
}

// DELETE - Remove evaluator assignment
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const { searchParams } = new URL(req.url);
        const evaluatorId = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!evaluatorId) {
            return NextResponse.json({ error: 'Evaluator ID is required' }, { status: 400 });
        }

        // Verify evaluator belongs to this exam
        const evaluator = await prisma.examEvaluator.findFirst({
            where: { id: evaluatorId, examId },
            include: {
                teacher: { select: { name: true } },
                subject: { select: { subjectName: true } },
                class: { select: { className: true } }
            }
        });

        if (!evaluator) {
            return NextResponse.json({ error: 'Evaluator not found' }, { status: 404 });
        }

        // Delete
        await prisma.examEvaluator.delete({
            where: { id: evaluatorId }
        });

        // Invalidate cache
        const cacheKey = generateKey('exam-evaluators', { schoolId, examId });
        await delCache(cacheKey);

        // Audit log
        if (userId) {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: 'DELETE',
                    tableName: 'ExamEvaluator',
                    rowId: evaluatorId,
                    oldData: {
                        teacherName: evaluator.teacher?.name,
                        subjectName: evaluator.subject?.subjectName,
                        className: evaluator.class?.className
                    }
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `Evaluator assignment removed`
        });
    } catch (error) {
        console.error('Evaluator removal error:', error);
        return NextResponse.json({ error: 'Failed to remove evaluator' }, { status: 500 });
    }
}