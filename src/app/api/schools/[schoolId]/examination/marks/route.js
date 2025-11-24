import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/examination/marks
// Fetch marks for a specific exam, class, and subject
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const examId = searchParams.get('examId');
        const classId = searchParams.get('classId');
        const subjectId = searchParams.get('subjectId');

        if (!examId || !classId || !subjectId) {
            return NextResponse.json(
                { error: 'Exam ID, Class ID, and Subject ID are required' },
                { status: 400 }
            );
        }

        // Fetch all students in the class
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                classId: parseInt(classId),
            },
            select: {
                userId: true,
                name: true,
                rollNumber: true,
                admissionNo: true,
            },
            orderBy: {
                rollNumber: 'asc',
            },
        });

        // Fetch existing marks
        const marks = await prisma.examResult.findMany({
            where: {
                examId: parseInt(examId),
                subjectId: parseInt(subjectId),
                studentId: {
                    in: students.map((s) => s.userId),
                },
            },
        });

        // Combine students with their marks
        const studentMarks = students.map((student) => {
            const mark = marks.find((m) => m.studentId === student.userId);
            return {
                ...student,
                marksObtained: mark?.marksObtained || '',
                grade: mark?.grade || '',
                remarks: mark?.remarks || '',
                isAbsent: mark?.isAbsent || false,
            };
        });

        return NextResponse.json(studentMarks);
    } catch (error) {
        console.error('Error fetching marks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch marks' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/examination/marks
// Bulk update marks
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        const { examId, subjectId, marks } = body; // marks: [{ studentId, marksObtained, grade, remarks, isAbsent }]

        if (!examId || !subjectId || !Array.isArray(marks)) {
            return NextResponse.json(
                { error: 'Invalid data provided' },
                { status: 400 }
            );
        }

        // Use transaction for bulk update
        await prisma.$transaction(
            marks.map((mark) =>
                prisma.examResult.upsert({
                    where: {
                        examId_studentId_subjectId: {
                            examId: parseInt(examId),
                            studentId: mark.studentId,
                            subjectId: parseInt(subjectId),
                        },
                    },
                    update: {
                        marksObtained: mark.marksObtained !== '' ? parseFloat(mark.marksObtained) : null,
                        grade: mark.grade,
                        remarks: mark.remarks,
                        isAbsent: mark.isAbsent,
                    },
                    create: {
                        examId: parseInt(examId),
                        studentId: mark.studentId,
                        subjectId: parseInt(subjectId),
                        marksObtained: mark.marksObtained !== '' ? parseFloat(mark.marksObtained) : null,
                        grade: mark.grade,
                        remarks: mark.remarks,
                        isAbsent: mark.isAbsent,
                    },
                })
            )
        );

        return NextResponse.json({ message: 'Marks updated successfully' });
    } catch (error) {
        console.error('Error updating marks:', error);
        return NextResponse.json(
            { error: 'Failed to update marks' },
            { status: 500 }
        );
    }
}
