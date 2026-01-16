// app/api/schools/transport/staff/route.js
// Handles CRUD for Transport Staff (Drivers & Conductors)
// GET: Fetch transport staff with pagination, search, role filter
// POST: Create new driver/conductor profile

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateKey, remember, delCache, invalidatePattern } from '@/lib/cache';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CACHE_TTL = 300; // 5 minutes

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('userId');
    const role = searchParams.get('role'); // DRIVER, CONDUCTOR, or null for all
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        // Build cache key
        const cacheKey = generateKey('transport-staff', { schoolId, search, role, isActive, page, limit, userId });

        // Try cache first
        const data = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                ...(role && { role }),
                ...(isActive !== null && isActive !== undefined && { isActive: isActive === 'true' }),
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } },
                        { employeeId: { contains: search, mode: 'insensitive' } },
                        { contactNumber: { contains: search, mode: 'insensitive' } },
                    ],
                }),
                ...(userId && { userId }),
            };

            const [staff, total] = await Promise.all([
                prisma.transportStaff.findMany({
                    where,
                    include: {
                        user: {
                            select: { id: true, email: true, profilePicture: true, status: true }
                        },
                        vehicleAssignments: {
                            where: { isActive: true },
                            include: {
                                vehicle: {
                                    select: {
                                        id: true,
                                        licensePlate: true,
                                        model: true,
                                        capacity: true,
                                        fuelType: true,
                                        mileage: true,
                                        rcExpiry: true,
                                        insuranceExpiry: true,
                                        pucExpiry: true,
                                        maintenanceDue: true,
                                        routes: {
                                            select: { id: true, name: true, stops: true }
                                        }
                                    }
                                }
                            }
                        },
                        // Include permanent route assignments for drivers
                        driverRouteAssignments: {
                            where: { isActive: true },
                            include: {
                                route: {
                                    select: {
                                        id: true,
                                        name: true,
                                        stops: true  // Include stops for route display
                                    }
                                },
                                vehicle: {
                                    select: {
                                        id: true,
                                        licensePlate: true,
                                        model: true,
                                        capacity: true,
                                        fuelType: true,
                                        mileage: true,
                                        rcExpiry: true,
                                        insuranceExpiry: true,
                                        pucExpiry: true,
                                        maintenanceDue: true,
                                        status: true,
                                    }
                                }
                            }
                        },
                        // Include permanent route assignments for conductors
                        conductorRouteAssignments: {
                            where: { isActive: true },
                            include: {
                                route: {
                                    select: {
                                        id: true,
                                        name: true,
                                        stops: true  // Include stops for route display
                                    }
                                },
                                vehicle: {
                                    select: {
                                        id: true,
                                        licensePlate: true,
                                        model: true,
                                        capacity: true,
                                        fuelType: true,
                                        mileage: true,
                                        rcExpiry: true,
                                        insuranceExpiry: true,
                                        pucExpiry: true,
                                        maintenanceDue: true,
                                        status: true,
                                    }
                                }
                            }
                        },
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.transportStaff.count({ where }),
            ]);

            return { staff, total, page, limit, totalPages: Math.ceil(total / limit) };
        }, CACHE_TTL);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching transport staff:', error);
        return NextResponse.json({ error: 'Failed to fetch transport staff' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        const {
            schoolId,
            role,
            name,
            email,
            contactNumber,
            employeeId,
            licenseNumber,
            licenseExpiry,
            address,
            emergencyContact,
            profilePicture,
            password,
        } = data;

        // Validation
        if (!schoolId || !role || !name || !email || !contactNumber || !employeeId) {
            return NextResponse.json({
                error: 'Missing required fields: schoolId, role, name, email, contactNumber, employeeId'
            }, { status: 400 });
        }

        if (!['DRIVER', 'CONDUCTOR'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role. Must be DRIVER or CONDUCTOR' }, { status: 400 });
        }

        // Check for duplicate email
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        // Check for duplicate employeeId in school
        const existingEmployee = await prisma.transportStaff.findUnique({
            where: { schoolId_employeeId: { schoolId, employeeId } }
        });
        if (existingEmployee) {
            return NextResponse.json({ error: 'Employee ID already exists in this school' }, { status: 400 });
        }

        // Get the role ID from the Role table (DRIVER or CONDUCTOR)
        let roleRecord = await prisma.role.findUnique({ where: { name: role } });
        if (!roleRecord) {
            // Create the role if it doesn't exist
            roleRecord = await prisma.role.create({ data: { name: role } });
        }

        // Create Supabase auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: password || `${employeeId}@temp123`,
            email_confirm: true,
        });

        if (authError) {
            console.error('Supabase auth error:', authError);
            return NextResponse.json({ error: 'Failed to create auth user: ' + authError.message }, { status: 500 });
        }

        // Create user and transport staff in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Hash the password before storing
            const plainPassword = password || `${employeeId}@temp123`;
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            // Create User
            const user = await tx.user.create({
                data: {
                    id: authData.user.id,
                    email,
                    name,
                    password: hashedPassword, // Store hashed password
                    schoolId,
                    roleId: roleRecord.id,
                    profilePicture: profilePicture || 'default.png',
                },
            });

            // Create TransportStaff
            const transportStaff = await tx.transportStaff.create({
                data: {
                    userId: user.id,
                    schoolId,
                    role,
                    name,
                    email,
                    contactNumber,
                    employeeId,
                    licenseNumber: role === 'DRIVER' ? licenseNumber : null,
                    licenseExpiry: role === 'DRIVER' && licenseExpiry ? new Date(licenseExpiry) : null,
                    address,
                    emergencyContact,
                    profilePicture,
                },
                include: {
                    user: { select: { id: true, email: true, profilePicture: true } },
                },
            });

            return transportStaff;
        });

        // Invalidate cache
        await invalidatePattern(`transport-staff:*schoolId:${schoolId}*`);

        return NextResponse.json({ success: true, transportStaff: result }, { status: 201 });
    } catch (error) {
        console.error('Error creating transport staff:', error);
        return NextResponse.json({ error: 'Failed to create transport staff: ' + error.message }, { status: 500 });
    }
}
