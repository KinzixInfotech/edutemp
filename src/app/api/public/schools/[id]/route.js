// Public API: Get single school profile details
// No authentication required - public endpoint

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';
import redis from '@/lib/redis';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { id } = params;

        const cacheKey = generateKey('school-profile', { id });

        const school = await remember(cacheKey, async () => {
            const profile = await prisma.schoolPublicProfile.findUnique({
                where: {
                    id,
                    isPubliclyVisible: true
                },
                include: {
                    school: {
                        select: {
                            name: true,
                            location: true,
                            profilePicture: true,
                            contactNumber: true,
                        }
                    },
                    achievements: {
                        orderBy: { year: 'desc' }
                    },
                    facilities: {
                        orderBy: { name: 'asc' }
                    },
                    badges: true,
                    gallery: {
                        orderBy: { createdAt: 'desc' }
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
                }
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

        // Create a unique key for this IP + date
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const viewKey = `view:${id}:${ip}:${today}`;

        // Check if this IP already viewed today (using Redis)
        const alreadyViewed = await redis.get(viewKey);

        if (!alreadyViewed) {
            // Increment view count
            await prisma.schoolPublicProfile.update({
                where: { id },
                data: { profileViews: { increment: 1 } }
            });

            // Mark this IP as viewed for today (expire after 24 hours)
            await redis.set(viewKey, '1', { ex: 86400 });
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
