import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/examination/exams/[examId]/seat-allocation
export async function GET(req, { params }) {
    try {
        const { examId } = await params;

        const allocations = await prisma.seatAllocation.findMany({
            where: { examId: examId },
            include: {
                student: {
                    select: {
                        userId: true,
                        name: true,
                        rollNumber: true,
                        class: {
                            select: { className: true },
                        },
                        section: {
                            select: { name: true },
                        },
                    },
                },
                hall: true,
            },
            orderBy: [
                { hall: { name: 'asc' } },
                { seatNumber: 'asc' },
            ],
        });

        return NextResponse.json(allocations);
    } catch (error) {
        console.error('Error fetching allocations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch allocations' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/examination/exams/[examId]/seat-allocation
// Auto-allocate seats
export async function POST(req, { params }) {
    try {
        const { schoolId, examId } = await params;

        // 1. Fetch Exam and its Classes
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: { classes: true },
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        // 2. Fetch all students eligible for this exam
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                classId: { in: exam.classes.map((c) => c.id) },
            },
            orderBy: [
                { classId: 'asc' },
                { sectionId: 'asc' },
                { rollNumber: 'asc' },
            ],
        });

        if (students.length === 0) {
            return NextResponse.json({ error: 'No students found for this exam' }, { status: 400 });
        }

        // 3. Fetch available halls
        const halls = await prisma.examHall.findMany({
            where: { schoolId },
            orderBy: { capacity: 'desc' }, // Fill largest first? Or alphabetical? Let's do alphabetical for predictability
        });

        if (halls.length === 0) {
            return NextResponse.json({ error: 'No exam halls defined' }, { status: 400 });
        }

        // 4. Clear existing allocations for this exam
        await prisma.seatAllocation.deleteMany({
            where: { examId: examId },
        });

        // 5. Allocation Logic
        const allocations = [];
        let currentStudentIndex = 0;

        for (const hall of halls) {
            let seatsFilled = 0;

            while (seatsFilled < hall.capacity && currentStudentIndex < students.length) {
                const student = students[currentStudentIndex];

                allocations.push({
                    examId: examId,
                    studentId: student.userId,
                    examHallId: hall.id,
                    seatNumber: `${hall.roomNumber || hall.name}-${seatsFilled + 1}`, // Simple seat numbering
                });

                seatsFilled++;
                currentStudentIndex++;
            }

            if (currentStudentIndex >= students.length) break;
        }

        // 6. Save Allocations
        if (allocations.length > 0) {
            await prisma.seatAllocation.createMany({
                data: allocations,
            });
        }

        return NextResponse.json({
            message: 'Seats allocated successfully',
            totalAllocated: allocations.length,
            totalStudents: students.length,
            unallocated: students.length - allocations.length,
        });

    } catch (error) {
        console.error('Error allocating seats:', error);
        return NextResponse.json(
            { error: 'Failed to allocate seats' },
            { status: 500 }
        );
    }
}
