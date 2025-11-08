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

        const filters = {
            schoolId,
        };

        if (classId) filters.classId = classId;
        if (academicYearId) filters.academicYearId = academicYearId;

        // Fetch all students with their related user info
        const students = await prisma.student.findMany({
            where: filters,
            select: {
                userId: true, // the actual unique identifier for user/student
                admissionNo: true,
                rollNumber: true,
                name:true,
                classId: true,
                academicYearId: true,
                class:true,
                // user: {
                //     select: {
                //         // name: true,
                //         email: true,
                //         // phone: true,
                //         // gender: true,
                //     },
                // },
            },
        });

        return NextResponse.json(students);
    } catch (error) {
        console.error('Error fetching students list:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
