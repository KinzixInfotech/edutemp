// app/api/schools/transport/staff/[id]/route.js
// Handles GET, PUT, DELETE for single transport staff member

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { delCache, invalidatePattern } from '@/lib/cache';

export async function GET(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const staff = await prisma.transportStaff.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, email: true, profilePicture: true, status: true, fcmToken: true }
                },
                vehicleAssignments: {
                    include: {
                        vehicle: {
                            select: { id: true, licensePlate: true, model: true, capacity: true, status: true }
                        }
                    }
                },
                driverTrips: {
                    take: 10,
                    orderBy: { date: 'desc' },
                    select: { id: true, tripType: true, status: true, date: true }
                },
                conductorTrips: {
                    take: 10,
                    orderBy: { date: 'desc' },
                    select: { id: true, tripType: true, status: true, date: true }
                },
            },
        });

        if (!staff) {
            return NextResponse.json({ error: 'Transport staff not found' }, { status: 404 });
        }

        return NextResponse.json({ staff });
    } catch (error) {
        console.error('Error fetching transport staff:', error);
        return NextResponse.json({ error: 'Failed to fetch transport staff' }, { status: 500 });
    }
}

export async function PUT(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const data = await req.json();
        const {
            name,
            contactNumber,
            licenseNumber,
            licenseExpiry,
            address,
            emergencyContact,
            profilePicture,
            isActive,
        } = data;

        // Check if staff exists
        const existingStaff = await prisma.transportStaff.findUnique({ where: { id } });
        if (!existingStaff) {
            return NextResponse.json({ error: 'Transport staff not found' }, { status: 404 });
        }

        // Update transport staff and user
        const updatedStaff = await prisma.$transaction(async (tx) => {
            // Update TransportStaff
            const staff = await tx.transportStaff.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(contactNumber && { contactNumber }),
                    ...(licenseNumber !== undefined && { licenseNumber }),
                    ...(licenseExpiry && { licenseExpiry: new Date(licenseExpiry) }),
                    ...(address !== undefined && { address }),
                    ...(emergencyContact !== undefined && { emergencyContact }),
                    ...(profilePicture && { profilePicture }),
                    ...(isActive !== undefined && { isActive }),
                },
                include: {
                    user: { select: { id: true, email: true, profilePicture: true } },
                    vehicleAssignments: {
                        where: { isActive: true },
                        include: { vehicle: { select: { id: true, licensePlate: true } } }
                    },
                },
            });

            // Update User if name or profile picture changed
            if (name || profilePicture) {
                await tx.user.update({
                    where: { id: staff.userId },
                    data: {
                        ...(name && { name }),
                        ...(profilePicture && { profilePicture }),
                    },
                });
            }

            return staff;
        });

        // Invalidate cache
        await invalidatePattern(`transport-staff:*schoolId:${existingStaff.schoolId}*`);

        return NextResponse.json({ success: true, staff: updatedStaff });
    } catch (error) {
        console.error('Error updating transport staff:', error);
        return NextResponse.json({ error: 'Failed to update transport staff' }, { status: 500 });
    }
}

export async function DELETE(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const existingStaff = await prisma.transportStaff.findUnique({ where: { id } });
        if (!existingStaff) {
            return NextResponse.json({ error: 'Transport staff not found' }, { status: 404 });
        }

        // Soft delete - just mark as inactive
        await prisma.transportStaff.update({
            where: { id },
            data: { isActive: false },
        });

        // Also deactivate all vehicle assignments
        await prisma.vehicleAssignment.updateMany({
            where: { transportStaffId: id },
            data: { isActive: false },
        });

        // Invalidate cache
        await invalidatePattern(`transport-staff:*schoolId:${existingStaff.schoolId}*`);

        return NextResponse.json({ success: true, message: 'Transport staff deactivated' });
    } catch (error) {
        console.error('Error deleting transport staff:', error);
        return NextResponse.json({ error: 'Failed to delete transport staff' }, { status: 500 });
    }
}
