import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = generateKey('director:transport', { schoolId });

        const data = await remember(cacheKey, async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [
                totalVehicles,
                activeVehicles,
                maintenanceVehicles,
                tripsToday,
                activeTrips
            ] = await Promise.all([
                prisma.vehicle.count({ where: { schoolId } }).catch(() => 0),
                prisma.vehicle.count({ where: { schoolId, status: 'active' } }).catch(() => 0),
                prisma.vehicle.count({ where: { schoolId, status: 'maintenance' } }).catch(() => 0),
                prisma.busTrip.count({
                    where: {
                        vehicle: { schoolId },
                        date: { gte: today, lt: tomorrow }
                    }
                }).catch(() => 0),
                prisma.busTrip.count({
                    where: {
                        vehicle: { schoolId },
                        date: { gte: today, lt: tomorrow },
                        status: 'IN_TRANSIT'
                    }
                }).catch(() => 0)
            ]);

            const vehicles = await prisma.vehicle.findMany({
                where: { schoolId },
                include: {
                    route: {
                        select: {
                            name: true,
                            startPoint: true,
                            endPoint: true
                        }
                    }
                },
                orderBy: { licensePlate: 'asc' }
            }).catch(() => []);

            return {
                summary: {
                    total: totalVehicles,
                    active: activeVehicles,
                    maintenance: maintenanceVehicles,
                    tripsToday,
                    activeTrips
                },
                vehicles: vehicles.map(v => ({
                    id: v.id,
                    licensePlate: v.licensePlate,
                    model: v.model,
                    capacity: v.capacity,
                    status: v.status,
                    routeName: v.route?.name,
                    routeDetails: v.route ? `${v.route.startPoint} → ${v.route.endPoint}` : null
                }))
            };
        }, 120);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[TRANSPORT ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch transport data', details: error.message },
            { status: 500 }
        );
    }
}
