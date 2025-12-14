// app/api/schools/transport/stops/[id]/route.js
// Handles GET, PUT, DELETE for single bus stop

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

export async function GET(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const stop = await prisma.busStop.findUnique({
            where: { id },
            include: {
                route: { select: { id: true, name: true, schoolId: true } },
                studentAssignments: {
                    where: { isActive: true },
                    include: {
                        student: {
                            select: { userId: true, name: true, admissionNo: true, class: { select: { className: true } } }
                        }
                    }
                },
            },
        });

        if (!stop) {
            return NextResponse.json({ error: 'Bus stop not found' }, { status: 404 });
        }

        return NextResponse.json({ stop });
    } catch (error) {
        console.error('Error fetching bus stop:', error);
        return NextResponse.json({ error: 'Failed to fetch bus stop' }, { status: 500 });
    }
}

export async function PUT(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const data = await req.json();
        const { name, latitude, longitude, orderIndex, pickupTime, dropTime, address, landmark, isActive } = data;

        const existingStop = await prisma.busStop.findUnique({
            where: { id },
            include: { route: { select: { schoolId: true } } }
        });
        if (!existingStop) {
            return NextResponse.json({ error: 'Bus stop not found' }, { status: 404 });
        }

        // If changing orderIndex, check for conflicts
        if (orderIndex !== undefined && orderIndex !== existingStop.orderIndex) {
            const conflictingStop = await prisma.busStop.findUnique({
                where: { routeId_orderIndex: { routeId: existingStop.routeId, orderIndex } }
            });
            if (conflictingStop) {
                return NextResponse.json({ error: 'A stop with this order index already exists' }, { status: 400 });
            }
        }

        const stop = await prisma.busStop.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
                ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
                ...(orderIndex !== undefined && { orderIndex: parseInt(orderIndex) }),
                ...(pickupTime !== undefined && { pickupTime }),
                ...(dropTime !== undefined && { dropTime }),
                ...(address !== undefined && { address }),
                ...(landmark !== undefined && { landmark }),
                ...(isActive !== undefined && { isActive }),
            },
            include: { route: { select: { id: true, name: true } } },
        });

        await invalidatePattern(`bus-stops:*schoolId:${existingStop.route.schoolId}*`);

        return NextResponse.json({ success: true, stop });
    } catch (error) {
        console.error('Error updating bus stop:', error);
        return NextResponse.json({ error: 'Failed to update bus stop' }, { status: 500 });
    }
}

export async function DELETE(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const existingStop = await prisma.busStop.findUnique({
            where: { id },
            include: { route: { select: { schoolId: true } } }
        });
        if (!existingStop) {
            return NextResponse.json({ error: 'Bus stop not found' }, { status: 404 });
        }

        // Soft delete
        await prisma.busStop.update({
            where: { id },
            data: { isActive: false },
        });

        // Deactivate student assignments for this stop
        await prisma.studentStopAssignment.updateMany({
            where: { stopId: id },
            data: { isActive: false },
        });

        await invalidatePattern(`bus-stops:*schoolId:${existingStop.route.schoolId}*`);

        return NextResponse.json({ success: true, message: 'Bus stop deactivated' });
    } catch (error) {
        console.error('Error deleting bus stop:', error);
        return NextResponse.json({ error: 'Failed to delete bus stop' }, { status: 500 });
    }
}
