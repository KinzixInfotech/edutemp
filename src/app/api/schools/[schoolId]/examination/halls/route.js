import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/examination/halls
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;

        const halls = await prisma.examHall.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(halls);
    } catch (error) {
        console.error('Error fetching halls:', error);
        return NextResponse.json(
            { error: 'Failed to fetch halls' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/examination/halls
export async function POST(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const { name, roomNumber, capacity } = body;

        if (!name || !capacity) {
            return NextResponse.json(
                { error: 'Name and Capacity are required' },
                { status: 400 }
            );
        }

        const hall = await prisma.examHall.create({
            data: {
                schoolId,
                name,
                roomNumber,
                capacity: parseInt(capacity),
            },
        });

        return NextResponse.json(hall);
    } catch (error) {
        console.error('Error creating hall:', error);
        return NextResponse.json(
            { error: 'Failed to create hall' },
            { status: 500 }
        );
    }
}
