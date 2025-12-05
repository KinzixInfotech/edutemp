import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/staff/teachers
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;

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
