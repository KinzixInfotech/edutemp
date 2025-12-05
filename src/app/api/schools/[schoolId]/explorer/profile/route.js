// Admin API: Get/Update School Public Profile
// Auth required - ADMIN only

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidatePattern } from '@/lib/cache';

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

        return NextResponse.json(profile);

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

        // Update profile
        const updated = await prisma.schoolPublicProfile.upsert({
            where: { schoolId },
            update: body,
            create: {
                schoolId,
                ...body,
            }
        });

        // Invalidate related caches
        await invalidatePattern('public-schools:*');
        await invalidatePattern('school-profile:*');
        await invalidatePattern('leaderboard:*');
        await invalidatePattern('school-explorer-analytics:*');

        return NextResponse.json(updated);

    } catch (error) {
        console.error('[PUBLIC PROFILE UPDATE API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
