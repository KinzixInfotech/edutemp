
// app/api/schools/transport/vehicles/[id]/route.js
// Handles operations for a specific vehicle
// GET: Fetch a single vehicle by ID
// Response: { vehicle: {...} }
// PUT: Update a vehicle
// Body: { licensePlate, model, capacity, maintenanceDue, status }
// Response: { vehicle: {...} }
// DELETE: Delete a vehicle
// Response: { success: true }

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id },
            select: {
                id: true,
                licensePlate: true,
                model: true,
                capacity: true,
                maintenanceDue: true,
                status: true,
                fuelType: true,
                mileage: true,
                rcNumber: true,
                rcExpiry: true,
                insuranceNumber: true,
                insuranceExpiry: true,
                pucNumber: true,
                pucExpiry: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }
        return NextResponse.json({ vehicle }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch vehicle' }, { status: 500 });
    }
}

export async function PUT(req, props) {
    const params = await props.params;
    const { id } = params;
    try {
        const rawData = await req.json();
        const data = { ...rawData };
        if (data.capacity) data.capacity = parseInt(data.capacity, 10);
        if (data.mileage) data.mileage = parseFloat(data.mileage);

        // Handle dates: convert empty strings to null
        if (data.rcExpiry === "") data.rcExpiry = null;
        else if (data.rcExpiry) data.rcExpiry = new Date(data.rcExpiry);

        if (data.insuranceExpiry === "") data.insuranceExpiry = null;
        else if (data.insuranceExpiry) data.insuranceExpiry = new Date(data.insuranceExpiry);

        if (data.pucExpiry === "") data.pucExpiry = null;
        else if (data.pucExpiry) data.pucExpiry = new Date(data.pucExpiry);

        if (data.maintenanceDue === "") data.maintenanceDue = null;
        else if (data.maintenanceDue) data.maintenanceDue = new Date(data.maintenanceDue);

        const vehicle = await prisma.vehicle.update({
            where: { id },
            data,
            select: {
                id: true,
                licensePlate: true,
                model: true,
                capacity: true,
                maintenanceDue: true,
                status: true,
                fuelType: true,
                mileage: true,
                rcNumber: true,
                rcExpiry: true,
                insuranceNumber: true,
                insuranceExpiry: true,
                pucNumber: true,
                pucExpiry: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return NextResponse.json({ vehicle });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
    }
}

export async function DELETE(req, props) {
    const params = await props.params;
    const { id } = params;
    try {
        await prisma.vehicle.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
    }
}
