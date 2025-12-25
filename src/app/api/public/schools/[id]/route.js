// Public API: Get single school profile details
// No authentication required - public endpoint
// Supports both slug and UUID lookup (optimized single query)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';
import redis from '@/lib/redis';
import { isUUID } from '@/lib/slug-generator';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { id } = params; // Can be either slug or UUID (schoolId)

        const cacheKey = generateKey('school-profile', { id });

        const school = await remember(cacheKey, async () => {
            // Optimized: Single query with OR condition instead of 2 separate queries
            const isIdUUID = isUUID(id);

            const profile = await prisma.schoolPublicProfile.findFirst({
                where: {
                    isPubliclyVisible: true,
                    OR: [
                        // If it's a UUID, try schoolId match
                        ...(isIdUUID ? [{ schoolId: id }] : []),
                        // Always try slug match (works for both)
                        { slug: id }
                    ]
                },
                include: getProfileIncludes()
            });

            return profile;
        }, 600); // 10 minutes cache

        if (!school) {
            return NextResponse.json(
                { error: 'School not found' },
                { status: 404 }
            );
        }

        // Track unique view (IP + Date based)
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';

        // Create a unique key for this IP + date (use schoolId for consistency)
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const viewKey = `view:${school.schoolId}:${ip}:${today}`;

        // Check if this IP already viewed today (using Redis)
        const alreadyViewed = await redis.get(viewKey);

        if (!alreadyViewed) {
            // Increment view count (fire and forget - don't await)
            prisma.schoolPublicProfile.update({
                where: { schoolId: school.schoolId },
                data: { profileViews: { increment: 1 } }
            }).catch(err => console.error('[View count update failed]', err));

            // Mark this IP as viewed for today (expire after 24 hours)
            redis.set(viewKey, '1', { ex: 86400 }).catch(() => { });
        }

        return NextResponse.json(school);

    } catch (error) {
        console.error('[SCHOOL PROFILE API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch school profile' },
            { status: 500 }
        );
    }
}

// Helper function to avoid duplication
function getProfileIncludes() {
    return {
        school: {
            select: {
                name: true,
                location: true,
                profilePicture: true,
                contactNumber: true,
            }
        },
        achievements: {
            orderBy: { year: 'desc' },
            take: 10 // Limit for performance
        },
        facilities: {
            orderBy: { name: 'asc' },
            take: 20 // Limit for performance
        },
        badges: {
            take: 5 // Limit for performance
        },
        gallery: {
            orderBy: { createdAt: 'desc' },
            take: 20 // Limit for performance
        },
        _count: {
            select: {
                achievements: true,
                facilities: true,
                badges: true,
                gallery: true,
                ratings: true,
            }
        }
    };
}
