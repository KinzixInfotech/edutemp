import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/api-auth';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req) {
    try {
        // Use shared auth utility - reduces code and ensures consistency
        const auth = await verifyAuth(req);
        if (auth.error) return auth.response;

        const { supabaseUser: user } = auth;

        // 2. Fetch authenticated user's reviews with caching
        const cacheKey = generateKey('parent-reviews', { userId: user.id });

        const reviews = await remember(cacheKey, async () => {
            return await prisma.schoolRating.findMany({
                where: { userId: user.id },
                include: {
                    profile: {
                        select: {
                            school: {
                                select: {
                                    name: true,
                                    location: true,
                                    profilePicture: true,
                                    schoolCode: true,
                                    publicProfile: { select: { id: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }, 300); // Cache for 5 minutes

        return NextResponse.json({ reviews });

    } catch (error) {
        console.error('[PARENT REVIEWS ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }
}
