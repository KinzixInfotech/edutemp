// app/api/schools/transport/vehicles/route.js
// Handles CRUD for vehicles
// GET: Fetch vehicles for a school with pagination and search
// Query params: schoolId (required), search (optional), page (default 1), limit (default 10)
// Response: { vehicles: [...], total: number }
// POST: Create a new vehicle
// Body: { licensePlate, model, capacity, maintenanceDue, status, schoolId }
// Response: { vehicle: {...} }

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
        const [vehicles, total] = await Promise.all([
            prisma.vehicle.findMany({
                where: {
                    schoolId,
                    OR: [
                        { licensePlate: { contains: search, mode: 'insensitive' } },
                        { model: { contains: search, mode: 'insensitive' } },
                    ],
                },
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
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.vehicle.count({
                where: {
                    schoolId,
                    OR: [
                        { licensePlate: { contains: search, mode: 'insensitive' } },
                        { model: { contains: search, mode: 'insensitive' } },
                    ],
                },
            }),
        ]);

        return NextResponse.json({ vehicles, total }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        const { capacity, mileage, rcExpiry, insuranceExpiry, pucExpiry, maintenanceDue, ...rest } = data;
        const vehicle = await prisma.vehicle.create({
            data: {
                ...rest,
                capacity: parseInt(capacity, 10),
                mileage: mileage ? parseFloat(mileage) : null,
                rcExpiry: rcExpiry ? new Date(rcExpiry) : null,
                insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
                pucExpiry: pucExpiry ? new Date(pucExpiry) : null,
                maintenanceDue: maintenanceDue ? new Date(maintenanceDue) : null,
            },
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
        return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
    }
}
