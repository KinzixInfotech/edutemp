import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/staff/teachers
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        const teachers = await prisma.teachingStaff.findMany({
            where: { schoolId },
            select: {
                userId: true,
                name: true,
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(teachers);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch teachers' },
            { status: 500 }
        );
    }
}
