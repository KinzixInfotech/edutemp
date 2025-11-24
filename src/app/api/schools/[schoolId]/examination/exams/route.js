import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/examination/exams
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get('academicYearId');
        const status = searchParams.get('status');

        const where = {
            schoolId,
            ...(academicYearId && { academicYearId }),
            ...(status && { status }),
        };

        const exams = await prisma.exam.findMany({
            where,
            include: {
                academicYear: true,
                classes: {
                    select: {
                        id: true,
                        className: true,
                    },
                },
                _count: {
                    select: {
                        subjects: true,
                        results: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        return NextResponse.json(
            { error: 'Failed to fetch exams' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/examination/exams
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        console.log("Create Exam Body:", body);
        const { title, type, startDate, endDate, academicYearId, classIds } = body;
        console.log("Class IDs:", classIds);

        if (!title || !academicYearId) {
            return NextResponse.json(
                { error: 'Title and Academic Year are required' },
                { status: 400 }
            );
        }

        const exam = await prisma.exam.create({
            data: {
                schoolId,
                title,
                academicYearId,
                type: type || 'OFFLINE',
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                status: 'DRAFT',
                classes: {
                    connect: classIds?.map((id) => ({ id: parseInt(id) })) || [],
                },
            },
        });

        return NextResponse.json(exam);
    } catch (error) {
        console.error('Error creating exam:', error);
        return NextResponse.json(
            { error: 'Failed to create exam', details: error.message },
            { status: 500 }
        );
    }
}
