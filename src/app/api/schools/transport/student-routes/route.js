
// app/api/schools/transport/student-routes/route.js
// Handles CRUD for student route assignments
// GET: Fetch student route assignments for a school with pagination
// Query params: schoolId (required), studentId (optional), routeId (optional), page (default 1), limit (default 10)
// Response: { assignments: [...], total: number }
// POST: Assign a student to a route
// Body: { studentId, routeId, schoolId }
// Response: { assignment: {...} }

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const routeId = searchParams.get('routeId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        const where = { schoolId };
        if (studentId) where.studentId = studentId;
        if (routeId) where.routeId = routeId;

        const [assignments, total] = await Promise.all([
            prisma.studentRouteAssignment.findMany({
                where,
                select: {
                    id: true,
                    studentId: true,
                    student: { select: { name: true } },
                    routeId: true,
                    route: { select: { name: true } },
                    assignedAt: true,
                },
                skip,
                take: limit,
                orderBy: { assignedAt: 'desc' },
            }),
            prisma.studentRouteAssignment.count({ where }),
        ]);

        return NextResponse.json({ assignments, total }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();

        const assignment = await prisma.studentRouteAssignment.create({
            data: data,
            select: {

                id: true,
                studentId: true,
                student: { select: { name: true } },
                routeId: true,
                route: { select: { name: true } },
                assignedAt: true,
            },
        });
        return NextResponse.json({ assignment });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }
}