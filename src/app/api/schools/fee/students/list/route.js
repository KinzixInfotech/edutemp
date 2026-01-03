import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');
        const classId = searchParams.get('classId');
        const academicYearId = searchParams.get('academicYearId');

        if (!schoolId) {
            return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
        }

        // Build filter - only filter by schoolId and classId if provided
        const filters = {
            schoolId,
        };

        if (classId) filters.classId = parseInt(classId, 10);
        if (academicYearId) filters.academicYearId = academicYearId;

        // Fetch all students with their related info and fee data
        const students = await prisma.student.findMany({
            where: filters,
            select: {
                userId: true,
                admissionNo: true,
                rollNumber: true,
                name: true,
                classId: true,
                academicYearId: true,
                class: {
                    select: {
                        id: true,
                        className: true,
                    }
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                // Include fee data
                studentFees: {
                    select: {
                        id: true,
                        finalAmount: true,
                        paidAmount: true,
                        balanceAmount: true,
                        status: true,
                    },
                    take: 1,
                    orderBy: {
                        assignedDate: 'desc'
                    }
                },
            },
            orderBy: [
                { class: { className: 'asc' } },
                { section: { name: 'asc' } },
                { rollNumber: 'asc' },
            ],
        });

        // Transform the data to include fee as a single object
        const transformedStudents = students.map(student => ({
            ...student,
            fee: student.studentFees?.[0] || null,
            studentFees: undefined,
        }));

        return NextResponse.json(transformedStudents);
    } catch (error) {
        console.error('Error fetching students list:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
