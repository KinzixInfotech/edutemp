// Public API: Compare multiple schools
// No authentication required - public endpoint

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolIds } = body;

        if (!schoolIds || !Array.isArray(schoolIds) || schoolIds.length === 0) {
            return NextResponse.json(
                { error: 'Please provide an array of school IDs' },
                { status: 400 }
            );
        }

        if (schoolIds.length > 3) {
            return NextResponse.json(
                { error: 'Maximum 3 schools can be compared at once' },
                { status: 400 }
            );
        }

        // Sort IDs to ensure cache hits regardless of order
        const sortedIds = [...schoolIds].sort().join(',');
        const cacheKey = generateKey('school-comparison', sortedIds);

        // Use Redis cache with 15 minute TTL
        const result = await remember(cacheKey, async () => {
            // Fetch all schools for comparison
            const schools = await prisma.schoolPublicProfile.findMany({
                where: {
                    id: { in: schoolIds },
                    isPubliclyVisible: true,
                },
                include: {
                    school: {
                        select: {
                            name: true,
                            location: true,
                            profilePicture: true,
                        }
                    },
                    facilities: {
                        select: {
                            category: true,
                            name: true,
                            isAvailable: true,
                        }
                    },
                    badges: {
                        select: {
                            badgeType: true,
                        }
                    },
                    _count: {
                        select: {
                            achievements: true,
                            ratings: true,
                        }
                    }
                }
            });

            if (schools.length === 0) {
                return null;
            }

            return {
                schools,
                comparison: {
                    count: schools.length,
                    requestedCount: schoolIds.length,
                }
            };
        }, 900); // 15 minutes cache

        if (!result) {
            return NextResponse.json(
                { error: 'No schools found with provided IDs' },
                { status: 404 }
            );
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('[SCHOOL COMPARISON API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to compare schools' },
            { status: 500 }
        );
    }
}
