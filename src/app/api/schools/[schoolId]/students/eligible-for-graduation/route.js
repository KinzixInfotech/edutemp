import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Get students eligible for graduation
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const classId = searchParams.get('classId');
    const sectionId = searchParams.get('sectionId');
    const search = searchParams.get('search');

    try {
        const where = {
            schoolId,
            isAlumni: false, // Only active students
            ...(classId && { classId: parseInt(classId) }),
            ...(sectionId && { sectionId: parseInt(sectionId) }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { admissionNo: { contains: search, mode: 'insensitive' } }
                ]
            })
        };
        const students = await prisma.student.findMany({
            where,
            include: {
                class: {
                    select: {
                        className: true
                    }
                },
                section: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [
                { classId: 'desc' },
                { name: 'asc' }
            ]
        });

        return NextResponse.json({
            success: true,
            students,
            count: students.length
        });

    } catch (error) {
        console.error('Error fetching eligible students:', error);
        return NextResponse.json(
            { error: 'Failed to fetch students', details: error.message },
            { status: 500 }
        );
    }
}
