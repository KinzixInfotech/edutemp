
// app/api/schools/transport/routes/route.js
// Handles CRUD for routes
// GET: Fetch routes for a school with pagination and search
// Query params: schoolId (required), search (optional), page (default 1), limit (default 10)
// Response: { routes: [...], total: number }
// POST: Create a new route
// Body: { name, stops, assignedVehicleId, schoolId }
// Response: { route: {...} }

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        const [routes, total] = await Promise.all([
            prisma.route.findMany({
                where: {
                    schoolId,
                    name: { contains: search, mode: 'insensitive' },
                },
                select: {
                    id: true,
                    name: true,
                    stops: true,
                    assignedVehicleId: true,
                    vehicle: { select: { licensePlate: true } },
                    createdAt: true,
                    updatedAt: true,
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.route.count({
                where: {
                    schoolId,
                    name: { contains: search, mode: 'insensitive' },
                },
            }),
        ]);

        return NextResponse.json({ routes, total }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        const route = await prisma.route.create({
            data,
            select: {
                id: true,
                name: true,
                stops: true,
                assignedVehicleId: true,
                vehicle: { select: { licensePlate: true } },
                createdAt: true,
                updatedAt: true,
            },
        });
        return NextResponse.json({ route });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create route' }, { status: 500 });
    }
}
