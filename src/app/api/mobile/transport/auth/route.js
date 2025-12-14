// app/api/mobile/transport/auth/route.js
// Mobile auth for drivers and conductors

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
    try {
        const data = await req.json();
        const { email, password, fcmToken, deviceInfo } = data;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Authenticate with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Get user with transport staff details
        const user = await prisma.user.findUnique({
            where: { id: authData.user.id },
            include: {
                transportStaff: {
                    include: {
                        school: { select: { id: true, name: true, profilePicture: true } },
                        vehicleAssignments: {
                            where: { isActive: true },
                            include: {
                                vehicle: {
                                    select: {
                                        id: true,
                                        licensePlate: true,
                                        model: true,
                                        routes: {
                                            select: { id: true, name: true }
                                        }
                                    }
                                }
                            }
                        },
                    },
                },
            },
        });

        if (!user || !user.transportStaff) {
            return NextResponse.json({
                error: 'User is not registered as transport staff (driver/conductor)'
            }, { status: 403 });
        }

        if (!user.transportStaff.isActive) {
            return NextResponse.json({ error: 'Your account has been deactivated. Contact admin.' }, { status: 403 });
        }

        // Update FCM token if provided
        if (fcmToken) {
            await prisma.user.update({
                where: { id: user.id },
                data: { fcmToken },
            });
        }

        // Get today's assigned trips
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const trips = await prisma.busTrip.findMany({
            where: {
                OR: [
                    { driverId: user.transportStaff.id },
                    { conductorId: user.transportStaff.id },
                ],
                date: { gte: today },
                status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            },
            include: {
                vehicle: { select: { id: true, licensePlate: true, model: true } },
                route: {
                    select: {
                        id: true,
                        name: true,
                        busStops: {
                            where: { isActive: true },
                            orderBy: { orderIndex: 'asc' },
                            select: { id: true, name: true, orderIndex: true, pickupTime: true, dropTime: true, latitude: true, longitude: true }
                        }
                    }
                },
            },
            orderBy: [{ date: 'asc' }, { tripType: 'asc' }],
            take: 10,
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture,
            },
            transportStaff: {
                id: user.transportStaff.id,
                role: user.transportStaff.role,
                employeeId: user.transportStaff.employeeId,
                name: user.transportStaff.name,
                contactNumber: user.transportStaff.contactNumber,
                licenseNumber: user.transportStaff.licenseNumber,
                school: user.transportStaff.school,
                assignedVehicles: user.transportStaff.vehicleAssignments,
            },
            todayTrips: trips,
            accessToken: authData.session.access_token,
            refreshToken: authData.session.refresh_token,
        });
    } catch (error) {
        console.error('Error in transport auth:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
}
