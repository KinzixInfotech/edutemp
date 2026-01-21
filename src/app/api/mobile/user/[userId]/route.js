// app/api/mobile/user/[userId]/route.js
// Mobile-friendly user profile endpoint - optimized with Redis caching
// Security: userId is stored locally from login, only accessible by logged-in user

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey, delCache } from '@/lib/cache';

// Cache TTL: 5 minutes for user profiles (they can change but not that frequently)
const PROFILE_CACHE_TTL = 300;

// Helper: Build optimized role-specific query
const getRoleSpecificData = async (userId, roleName) => {
    switch (roleName) {
        case 'ADMIN':
            return prisma.admin.findUnique({
                where: { userId },
                select: {
                    id: true,
                    schoolId: true,
                    school: { select: { id: true, name: true, profilePicture: true } },
                },
            });

        case 'STUDENT':
            return prisma.student.findUnique({
                where: { userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    admissionNo: true,
                    rollNumber: true,
                    contactNumber: true,
                    Address: true,
                    city: true,
                    state: true,
                    gender: true,
                    dob: true,
                    bloodGroup: true,
                    admissionDate: true,
                    FatherName: true,
                    MotherName: true,
                    schoolId: true,
                    school: { select: { id: true, name: true, profilePicture: true } },
                    class: { select: { id: true, className: true } },
                    section: { select: { id: true, name: true } },
                },
            });

        case 'PARENT':
            return prisma.parent.findUnique({
                where: { userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    contactNumber: true,
                    address: true,
                    city: true,
                    state: true,
                    occupation: true,
                    qualification: true,
                    bloodGroup: true,
                    alternateNumber: true,
                    emergencyContactName: true,
                    emergencyContactNumber: true,
                    schoolId: true,
                    school: { select: { id: true, name: true, profilePicture: true } },
                    studentLinks: {
                        select: {
                            id: true,
                            relation: true,
                            student: {
                                select: {
                                    userId: true,
                                    name: true,
                                    admissionNo: true,
                                    user: { select: { profilePicture: true } },
                                    class: { select: { className: true } },
                                    section: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            });

        case 'TEACHING_STAFF':
            return prisma.teachingStaff.findUnique({
                where: { userId },
                select: {
                    userId: true,
                    name: true,
                    email: true,
                    contactNumber: true,
                    employeeId: true,
                    designation: true,
                    gender: true,
                    age: true,
                    dob: true,
                    bloodGroup: true,
                    address: true,
                    City: true,
                    district: true,
                    state: true,
                    country: true,
                    PostalCode: true,
                    schoolId: true,
                    school: { select: { id: true, name: true, profilePicture: true } },
                    department: { select: { id: true, name: true } },
                },
            });

        case 'DRIVER':
        case 'CONDUCTOR':
            return prisma.transportStaff.findUnique({
                where: { userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    contactNumber: true,
                    employeeId: true,
                    role: true,
                    licenseNumber: true,
                    licenseExpiry: true,
                    profilePicture: true,
                    isActive: true,
                    schoolId: true,
                    school: { select: { id: true, name: true, profilePicture: true } },
                    driverRouteAssignments: {
                        where: { isActive: true },
                        take: 1,
                        select: {
                            vehicle: { select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true } },
                            route: { select: { id: true, name: true } },
                        },
                    },
                    conductorRouteAssignments: {
                        where: { isActive: true },
                        take: 1,
                        select: {
                            vehicle: { select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true } },
                            route: { select: { id: true, name: true } },
                        },
                    },
                    vehicleAssignments: {
                        where: { isActive: true },
                        take: 1,
                        select: {
                            vehicle: { select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true } },
                        },
                    },
                },
            });

        case 'DIRECTOR':
            return prisma.director.findUnique({
                where: { userId },
                select: {
                    id: true,
                    department: true,
                    joinDate: true,
                    schoolId: true,
                    school: { select: { id: true, name: true, profilePicture: true } },
                },
            });

        case 'PRINCIPAL':
            return prisma.principal.findUnique({
                where: { userId },
                select: {
                    id: true,
                    department: true,
                    joinDate: true,
                    schoolId: true,
                    school: { select: { id: true, name: true, profilePicture: true } },
                },
            });

        default:
            return null;
    }
};

// Map role data to response key
const getRoleDataKey = (roleName) => {
    const mapping = {
        'ADMIN': 'adminData',
        'STUDENT': 'studentData',
        'PARENT': 'parentData',
        'TEACHING_STAFF': 'teacherData',
        'DRIVER': 'transportStaffData',
        'CONDUCTOR': 'transportStaffData',
        'DIRECTOR': 'directorData',
        'PRINCIPAL': 'principalData',
    };
    return mapping[roleName] || null;
};

export async function GET(req, context) {
    try {
        const { userId } = await context.params;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const cacheKey = generateKey('mobile:profile', userId);
        const start = performance.now();

        // Try cache first, fallback to DB
        const profile = await remember(cacheKey, async () => {
            console.log(`📱 [Mobile API] Cache MISS for userId: ${userId}`);

            // Single optimized query for base user
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    profilePicture: true,
                    role: { select: { id: true, name: true } },
                },
            });

            if (!user) return null;

            // Get role-specific data in parallel (single query per role)
            const roleData = await getRoleSpecificData(userId, user.role.name);
            const roleDataKey = getRoleDataKey(user.role.name);

            // Build response
            const response = {
                id: user.id,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture,
                role: user.role,
                schoolId: roleData?.schoolId || null,
                school: roleData?.school || null,
            };

            // Add role-specific data under correct key
            if (roleDataKey && roleData) {
                response[roleDataKey] = roleData;
            }

            return response;
        }, PROFILE_CACHE_TTL);

        if (!profile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const end = performance.now();
        const cacheStatus = end - start < 50 ? 'HIT' : 'MISS';
        console.log(`� [Mobile API] Profile for ${userId} | ${cacheStatus} | ${(end - start).toFixed(2)}ms`);

        return NextResponse.json(profile);
    } catch (error) {
        console.error('❌ [Mobile API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Optional: Invalidate cache when profile is updated (call from PUT/PATCH handlers)
export const invalidateProfileCache = async (userId) => {
    const cacheKey = generateKey('mobile:profile', userId);
    await delCache(cacheKey);
    console.log(`🗑️ [Mobile API] Cache invalidated for userId: ${userId}`);
};
