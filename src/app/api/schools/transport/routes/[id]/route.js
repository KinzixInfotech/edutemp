
// app/api/schools/transport/routes/[id]/route.js
// Handles operations for a specific route
// GET: Fetch a single route by ID
// Response: { route: {...} }
// PUT: Update a route
// Body: { name, stops, assignedVehicleId }
// Response: { route: {...} }
// DELETE: Delete a route
// Response: { success: true }

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const route = await prisma.route.findUnique({
            where: { id },
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
        if (!route) {
            return NextResponse.json({ error: 'Route not found' }, { status: 404 });
        }
        return NextResponse.json({ route }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch route' }, { status: 500 });
    }
}

export async function PUT(req, props) {
    const params = await props.params;
    try {
        const { id } = params;
        const data = await req.json();

        // Only keep fields Prisma accepts on update
        const cleanData = {
            ...(data.name && { name: data.name }),
            ...(data.stops && { stops: data.stops }),
            assignedVehicleId: data.assignedVehicleId || null,
        };

        const route = await prisma.route.update({
            where: { id },
            data: cleanData,
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
        return NextResponse.json({ error: "Failed to update route" }, { status: 500 });
    }
}

export async function DELETE(req, props) {
    const params = await props.params;
    const { id } = params;
    try {
        await prisma.route.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 });
    }
}
