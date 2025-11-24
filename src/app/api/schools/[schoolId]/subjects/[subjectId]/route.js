import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/subjects/[subjectId]
export async function GET(req, { params }) {
    try {
        const { subjectId } = await params;

        const subject = await prisma.subject.findUnique({
            where: { id: parseInt(subjectId) },
            include: {
                class: {
                    select: {
                        className: true,
                        schoolId: true,
                    },
                },
                department: {
                    select: {
                        name: true,
                    },
                },
                _count: {
                    select: {
                        examResults: true,
                        homework: true,
                        examSubjects: true,
                        Teacher: true,
                    },
                },
            },
        });

        if (!subject) {
            return NextResponse.json(
                { error: 'Subject not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(subject);
    } catch (error) {
        console.error('Error fetching subject:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subject' },
            { status: 500 }
        );
    }
}

// PUT /api/schools/[schoolId]/subjects/[subjectId]
export async function PUT(req, { params }) {
    try {
        const { schoolId, subjectId } = await params;
        const body = await req.json();
        const { subjectName, subjectCode, classId, departmentId } = body;

        // Verify subject exists and belongs to this school
        const existingSubject = await prisma.subject.findFirst({
            where: {
                id: parseInt(subjectId),
                class: {
                    schoolId: schoolId,
                },
            },
        });

        if (!existingSubject) {
            return NextResponse.json(
                { error: 'Subject not found' },
                { status: 404 }
            );
        }

        // If classId is being changed, verify new class belongs to school
        if (classId && classId !== existingSubject.classId) {
            const classExists = await prisma.class.findFirst({
                where: {
                    id: parseInt(classId),
                    schoolId: schoolId,
                },
            });

            if (!classExists) {
                return NextResponse.json(
                    { error: 'Class not found or does not belong to this school' },
                    { status: 404 }
                );
            }
        }

        const subject = await prisma.subject.update({
            where: { id: parseInt(subjectId) },
            data: {
                subjectName: subjectName || undefined,
                subjectCode: subjectCode !== undefined ? subjectCode : undefined,
                classId: classId ? parseInt(classId) : undefined,
                departmentId: departmentId ? parseInt(departmentId) : undefined,
            },
            include: {
                class: {
                    select: {
                        className: true,
                    },
                },
                department: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json(subject);
    } catch (error) {
        console.error('Error updating subject:', error);
        return NextResponse.json(
            { error: 'Failed to update subject' },
            { status: 500 }
        );
    }
}

// DELETE /api/schools/[schoolId]/subjects/[subjectId]
export async function DELETE(req, { params }) {
    try {
        const { schoolId, subjectId } = await params;

        // Verify subject exists and belongs to this school
        const subject = await prisma.subject.findFirst({
            where: {
                id: parseInt(subjectId),
                class: {
                    schoolId: schoolId,
                },
            },
            include: {
                _count: {
                    select: {
                        examSubjects: true,
                        examResults: true,
                        homework: true,
                    },
                },
            },
        });

        if (!subject) {
            return NextResponse.json(
                { error: 'Subject not found' },
                { status: 404 }
            );
        }

        // Check if subject is used in any exams, results, or homework
        const hasUsage =
            subject._count.examSubjects > 0 ||
            subject._count.examResults > 0 ||
            subject._count.homework > 0;

        if (hasUsage) {
            return NextResponse.json(
                {
                    error: 'Cannot delete subject',
                    message: `This subject is currently used in ${subject._count.examSubjects} exam(s), ${subject._count.examResults} result(s), and ${subject._count.homework} homework assignment(s)`,
                },
                { status: 400 }
            );
        }

        await prisma.subject.delete({
            where: { id: parseInt(subjectId) },
        });

        return NextResponse.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        console.error('Error deleting subject:', error);
        return NextResponse.json(
            { error: 'Failed to delete subject' },
            { status: 500 }
        );
    }
}
