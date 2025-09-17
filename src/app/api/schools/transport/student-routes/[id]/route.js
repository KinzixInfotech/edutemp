
// app/api/schools/transport/student-routes/[id]/route.js
// Handles operations for a specific student route assignment
// GET: Fetch a single assignment by ID
// Response: { assignment: {...} }
// DELETE: Delete an assignment
// Response: { success: true }

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    const { id } = params;

    try {
        const assignment = await prisma.studentRouteAssignment.findUnique({
            where: { id },
            select: {
                id: true,
                studentId: true,
                student: { select: { name: true } },
                routeId: true,
                route: { select: { name: true } },
                assignedAt: true,
            },
        });
        if (!assignment) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }
        return NextResponse.json({ assignment }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    const { id } = params;
    try {
        await prisma.studentRouteAssignment.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }
}
