import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Get attendance for a hall in an exam
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { examId, hallId } = params;

        // Get all students allocated to this hall for this exam
        const allocations = await prisma.seatAllocation.findMany({
            where: {
                examId: examId,
                examHallId: hallId
            },
            include: {
                student: {
                    select: {
                        userId: true,
                        name: true,
                        // Add other student details if needed
                    }
                }
            }
        });

        // Get existing attendance records
        const attendance = await prisma.hallAttendance.findMany({
            where: {
                examId: examId,
                hallId: hallId
            }
        });

        // Merge data
        const result = allocations.map(alloc => {
            const record = attendance.find(a => a.studentId === alloc.studentId);
            return {
                studentId: alloc.studentId,
                name: alloc.student.name,
                seatNumber: alloc.seatNumber,
                status: record ? record.status : 'PENDING',
                markedAt: record ? record.markedAt : null,
                markedBy: record ? record.markedBy : null
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching hall attendance:', error);
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }
}

// POST: Mark attendance
export async function POST(req, props) {
  const params = await props.params;
    try {
        const { examId, hallId } = params;
        const body = await req.json();
        const { students, markedBy } = body; // students: [{ studentId, status }]

        if (!Array.isArray(students)) {
            return NextResponse.json({ error: 'Students array required' }, { status: 400 });
        }

        // Upsert attendance records
        const operations = students.map(s =>
            prisma.hallAttendance.upsert({
                where: {
                    examId_studentId: {
                        examId: examId,
                        studentId: s.studentId
                    }
                },
                update: {
                    status: s.status,
                    markedBy: markedBy,
                    markedAt: new Date(),
                    hallId: hallId
                },
                create: {
                    examId: examId,
                    hallId: hallId,
                    studentId: s.studentId,
                    status: s.status,
                    markedBy: markedBy,
                    markedAt: new Date()
                }
            })
        );

        await prisma.$transaction(operations);

        return NextResponse.json({ message: 'Attendance marked successfully' });
    } catch (error) {
        console.error('Error marking attendance:', error);
        return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 });
    }
}
