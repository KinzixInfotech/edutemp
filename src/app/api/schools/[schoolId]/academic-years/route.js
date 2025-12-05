import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/academic-years
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;

        const academicYears = await prisma.academicYear.findMany({
            where: { schoolId },
            orderBy: { startDate: 'desc' },
        });

        return NextResponse.json(academicYears);
    } catch (error) {
        console.error('Error fetching academic years:', error);
        return NextResponse.json(
            { error: 'Failed to fetch academic years' },
            { status: 500 }
        );
    }
}
