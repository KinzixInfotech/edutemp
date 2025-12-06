import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { remember, generateKey } from '@/lib/cache';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req) {
    try {
        // 1. Check Supabase authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
        }

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
