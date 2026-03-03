// Admin API: Get/Update School Public Profile
// PATCH now creates a change request instead of direct update
// Auth required - ADMIN only

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidatePattern } from '@/lib/cache';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// Fields that are part of the public profile and can be submitted for review
const PROFILE_FIELDS = [
    'tagline', 'description', 'vision', 'mission',
    'coverImage', 'logoImage', 'videoUrl',
    'publicEmail', 'publicPhone', 'website',
    'minFee', 'maxFee', 'feeStructureUrl', 'detailedFeeStructure',
    'establishedYear', 'totalStudents', 'totalTeachers', 'studentTeacherRatio',
    'latitude', 'longitude',
    'isPubliclyVisible', 'isFeatured',
];

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;

        let profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            include: {
                school: {
                    select: {
                        name: true,
                        location: true,
                        profilePicture: true,
                        contactNumber: true,
                    }
                }
            }
        });

        // Create default profile if doesn't exist
        if (!profile) {
            profile = await prisma.schoolPublicProfile.create({
                data: {
                    schoolId,
                    isPubliclyVisible: false,
                },
                include: {
                    school: {
                        select: {
                            name: true,
                            location: true,
                            profilePicture: true,
                            contactNumber: true,
                        }
                    }
                }
            });
        }

        // Fetch pending change requests
        const pendingChanges = await prisma.profileChangeRequest.findMany({
            where: {
                schoolId,
                status: 'PENDING',
            },
            include: {
                requestedBy: {
                    select: { id: true, name: true, email: true, profilePicture: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ ...profile, pendingChanges });

    } catch (error) {
        console.error('[PUBLIC PROFILE API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

export async function PATCH(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const body = await req.json();
        const { _requestedById, ...updateData } = body;

        if (!_requestedById) {
            return NextResponse.json(
                { error: 'Missing _requestedById (admin user ID)' },
                { status: 400 }
            );
        }

        // Get current profile to compute diff
        let currentProfile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
        });

        if (!currentProfile) {
            currentProfile = await prisma.schoolPublicProfile.create({
                data: { schoolId, isPubliclyVisible: false },
            });
        }

        // Compute diff: only include fields that actually changed
        const changes = {};
        for (const field of PROFILE_FIELDS) {
            if (field in updateData) {
                const oldVal = currentProfile[field];
                const newVal = updateData[field];
                // Compare with JSON.stringify for objects, direct for primitives
                const oldStr = JSON.stringify(oldVal ?? null);
                const newStr = JSON.stringify(newVal ?? null);
                if (oldStr !== newStr) {
                    changes[field] = { old: oldVal ?? null, new: newVal ?? null };
                }
            }
        }

        if (Object.keys(changes).length === 0) {
            return NextResponse.json({ message: 'No changes detected', noChanges: true });
        }

        // Create a change request
        const changeRequest = await prisma.profileChangeRequest.create({
            data: {
                schoolId,
                requestedById: _requestedById,
                changes,
                type: 'PROFILE_UPDATE',
                status: 'PENDING',
            },
        });

        // Find SUPER_ADMIN users to notify
        const superAdmins = await prisma.user.findMany({
            where: {
                role: { name: 'SUPER_ADMIN' },
            },
            select: { id: true },
        });

        if (superAdmins.length > 0) {
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                select: { name: true },
            });
            const changedFieldCount = Object.keys(changes).length;

            await sendNotification({
                schoolId,
                title: '📝 Profile Update Request',
                message: `${school?.name || 'A school'} has submitted ${changedFieldCount} profile change${changedFieldCount > 1 ? 's' : ''} for review.`,
                type: 'GENERAL',
                priority: 'HIGH',
                targetOptions: { userIds: superAdmins.map(u => u.id) },
                senderId: _requestedById,
                metadata: { changeRequestId: changeRequest.id },
                actionUrl: '/dashboard/master-admin/profile-reviews',
                sendPush: true,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Changes submitted for review',
            changeRequest,
        });

    } catch (error) {
        console.error('[PUBLIC PROFILE UPDATE API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to submit profile changes' },
            { status: 500 }
        );
    }
}
