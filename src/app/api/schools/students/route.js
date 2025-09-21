// app/api/schools/students/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    try {
        const students = await prisma.student.findMany({
            where: { schoolId },
            select: { userId: true, name: true },
        });
        return NextResponse.json({ students });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
}