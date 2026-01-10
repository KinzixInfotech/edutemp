import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, delCache, generateKey } from '@/lib/cache';
import { notifyInvigilatorAssigned } from '@/lib/notifications/notificationHelper';

// GET - List invigilators for an exam
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const cacheKey = generateKey('exam-invigilators', { schoolId, examId });

        const invigilators = await remember(cacheKey, async () => {
            return await prisma.examHallInvigilator.findMany({
                where: {
                    examId,
                    exam: { schoolId }
                },
                include: {
                    teacher: {
                        select: {
                            userId: true,
                            name: true,
                            employeeId: true,
                            email: true,
                            designation: true
                        }
                    },
                    hall: {
                        select: {
                            id: true,
                            name: true,
                            roomNumber: true
                        }
                    },
                    subject: {
                        select: {
                            subjectName: true
                        }
                    }
                },
                orderBy: [
                    { date: 'asc' },
                    { startTime: 'asc' }
                ]
            });
        }, 180); // Cache for 3 minutes

        return NextResponse.json({
            invigilators,
            total: invigilators.length
        });

    } catch (error) {
        console.error('[INVIGILATORS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// POST - Assign an invigilator
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const body = await req.json();
        const { teacherId, hallId, assignedBy, date, startTime, endTime, role, subjectId } = body;

        if (!teacherId || !hallId || !date || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Teacher, Hall, Date, and Time are required' },
                { status: 400 }
            );
        }

        // Verify exam exists
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            select: {
                schoolId: true,
                title: true
            }
        });

        if (!exam || exam.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        // Create assignment (ALLOW OVERLAPS as per requirements)
        const invigilator = await prisma.examHallInvigilator.create({
            data: {
                examId,
                hallId,
                teacherId,
                date: new Date(date),
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                role: role || 'PRIMARY',
                subjectId: subjectId ? parseInt(subjectId) : null,
                assignedAt: new Date()
            },
            include: {
                hall: { select: { name: true } },
                teacher: { select: { name: true } },
                subject: { select: { subjectName: true } }
            }
        });

        // Invalidate cache
        const cacheKey = generateKey('exam-invigilators', { schoolId, examId });
        await delCache(cacheKey);

        // Audit log
        if (assignedBy) {
            await prisma.auditLog.create({
                data: {
                    userId: assignedBy,
                    action: 'CREATE',
                    tableName: 'ExamHallInvigilator',
                    rowId: invigilator.id,
                    newData: {
                        examId,
                        teacherId,
                        hallId,
                        date,
                        startTime,
                        endTime,
                        role,
                        subjectId,
                        teacherName: invigilator.teacher?.name,
                        hallName: invigilator.hall?.name,
                        subjectName: invigilator.subject?.subjectName
                    }
                }
            });
        }

        // Send Notification
        notifyInvigilatorAssigned({
            schoolId,
            teacherId,
            examName: exam.title,
            date: new Date(date),
            hallName: invigilator.hall.name,
            senderId: assignedBy
        }).catch(err => {
            console.error('Failed to send invigilator notification:', err);
        });

        return NextResponse.json(invigilator);

    } catch (error) {
        console.error('[INVIGILATORS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

// DELETE - Remove an invigilator
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return new NextResponse('ID required', { status: 400 });
        }

        await prisma.examHallInvigilator.delete({
            where: { id }
        });

        // Invalidate cache
        const cacheKey = generateKey('exam-invigilators', { schoolId, examId });
        await delCache(cacheKey);

        return NextResponse.json({ message: 'Invigilator removed' });

    } catch (error) {
        console.error('[INVIGILATORS_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
