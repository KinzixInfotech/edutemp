// Route Assignment API - Permanent driver-route-vehicle assignments
// GET: List assignments | POST: Create/update | DELETE: Remove

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// GET - List all permanent route assignments for a school
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        const assignments = await prisma.routeAssignment.findMany({
            where: { schoolId },
            include: {
                route: { select: { id: true, name: true, stops: true } },
                vehicle: { select: { id: true, licensePlate: true, model: true } },
                driver: { select: { id: true, userId: true, name: true, contactNumber: true, profilePicture: true } },
                conductor: { select: { id: true, userId: true, name: true, contactNumber: true, profilePicture: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ assignments, total: assignments.length });
    } catch (error) {
        console.error('Error fetching route assignments:', error);
        return NextResponse.json({ error: 'Failed to fetch route assignments' }, { status: 500 });
    }
}

// POST - Create or update a permanent route assignment
export async function POST(req) {
    try {
        const data = await req.json();
        const { schoolId, routeId, vehicleId, driverId, conductorId, senderId } = data;

        if (!schoolId || !routeId || !vehicleId || !driverId) {
            return NextResponse.json({
                error: 'Missing required fields: schoolId, routeId, vehicleId, driverId'
            }, { status: 400 });
        }

        // Check if route already has an assignment
        const existing = await prisma.routeAssignment.findUnique({
            where: { routeId },
            include: { driver: true }
        });

        const isUpdate = !!existing;
        const oldDriverId = existing?.driver?.userId;

        // Upsert the assignment
        const assignment = await prisma.routeAssignment.upsert({
            where: { routeId },
            update: {
                vehicleId,
                driverId,
                conductorId: conductorId || null,
                isActive: true,
                updatedAt: new Date(),
            },
            create: {
                schoolId,
                routeId,
                vehicleId,
                driverId,
                conductorId: conductorId || null,
            },
            include: {
                route: { select: { id: true, name: true } },
                vehicle: { select: { id: true, licensePlate: true } },
                driver: { select: { id: true, userId: true, name: true } },
                conductor: { select: { id: true, userId: true, name: true } },
            },
        });

        // Get driver user ID for notification
        const driverUserId = assignment.driver?.userId;
        const conductorUserId = assignment.conductor?.userId;

        // Notify driver about assignment
        if (driverUserId) {
            await sendNotification({
                schoolId,
                title: isUpdate ? '🚌 Route Assignment Updated' : '🚌 Route Assigned',
                message: `You have been ${isUpdate ? 'reassigned' : 'assigned'} to route "${assignment.route.name}" with vehicle ${assignment.vehicle.licensePlate}`,
                type: 'TRANSPORT',
                priority: 'HIGH',
                icon: '🚌',
                targetOptions: { userIds: [driverUserId] },
                senderId,
                metadata: {
                    routeId,
                    routeName: assignment.route.name,
                    vehiclePlate: assignment.vehicle.licensePlate,
                    assignmentType: isUpdate ? 'UPDATED' : 'ASSIGNED'
                },
                actionUrl: '/transport/trips'
            });
        }

        // Notify conductor if assigned
        if (conductorUserId) {
            await sendNotification({
                schoolId,
                title: '🚌 Conductor Assignment',
                message: `You have been assigned as conductor for route "${assignment.route.name}" with vehicle ${assignment.vehicle.licensePlate}`,
                type: 'TRANSPORT',
                priority: 'HIGH',
                icon: '🚌',
                targetOptions: { userIds: [conductorUserId] },
                senderId,
                metadata: {
                    routeId,
                    routeName: assignment.route.name,
                    vehiclePlate: assignment.vehicle.licensePlate,
                    assignmentType: 'ASSIGNED'
                },
                actionUrl: '/transport/trips'
            });
        }

        // Notify old driver if different from new driver
        if (isUpdate && oldDriverId && oldDriverId !== driverUserId) {
            await sendNotification({
                schoolId,
                title: '🚌 Route Assignment Removed',
                message: `You have been removed from route "${assignment.route.name}"`,
                type: 'TRANSPORT',
                priority: 'NORMAL',
                icon: '🚌',
                targetOptions: { userIds: [oldDriverId] },
                senderId,
                metadata: { routeId, assignmentType: 'REMOVED' },
            });
        }

        return NextResponse.json({
            success: true,
            assignment,
            isUpdate,
            message: isUpdate ? 'Assignment updated successfully' : 'Driver assigned to route successfully'
        }, { status: isUpdate ? 200 : 201 });

    } catch (error) {
        console.error('Error creating route assignment:', error);
        return NextResponse.json({ error: 'Failed to create route assignment' }, { status: 500 });
    }
}

// DELETE - Remove a route assignment
export async function DELETE(req) {
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get('routeId');
    const senderId = searchParams.get('senderId');

    if (!routeId) {
        return NextResponse.json({ error: 'routeId is required' }, { status: 400 });
    }

    try {
        // Get assignment before deleting for notification
        const existing = await prisma.routeAssignment.findUnique({
            where: { routeId },
            include: {
                route: { select: { name: true } },
                driver: { select: { userId: true, name: true } },
                conductor: { select: { userId: true } },
            }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        // Delete the assignment
        await prisma.routeAssignment.delete({
            where: { routeId }
        });

        // Notify driver about removal
        if (existing.driver?.userId) {
            await sendNotification({
                schoolId: existing.schoolId,
                title: '🚌 Route Assignment Removed',
                message: `You have been removed from route "${existing.route.name}"`,
                type: 'TRANSPORT',
                priority: 'NORMAL',
                icon: '🚌',
                targetOptions: { userIds: [existing.driver.userId] },
                senderId,
                metadata: { routeId, assignmentType: 'REMOVED' },
            });
        }

        // Notify conductor about removal
        if (existing.conductor?.userId) {
            await sendNotification({
                schoolId: existing.schoolId,
                title: '🚌 Conductor Assignment Removed',
                message: `You have been removed as conductor from route "${existing.route.name}"`,
                type: 'TRANSPORT',
                priority: 'NORMAL',
                icon: '🚌',
                targetOptions: { userIds: [existing.conductor.userId] },
                senderId,
                metadata: { routeId, assignmentType: 'REMOVED' },
            });
        }

        return NextResponse.json({ success: true, message: 'Assignment removed' });

    } catch (error) {
        console.error('Error deleting route assignment:', error);
        return NextResponse.json({ error: 'Failed to delete route assignment' }, { status: 500 });
    }
}
