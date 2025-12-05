// Public API: School leaderboard/rankings
// No authentication required - public endpoint

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        // Category filter
        const category = searchParams.get('category') || 'overall'; // overall, academic, sports, infrastructure
        const limit = parseInt(searchParams.get('limit') || '10');

        // Generate cache key
        const cacheKey = generateKey('leaderboard', { category, limit });

        // Use Redis cache with 30 second TTL (reduced from 10m for faster updates)
        const result = await remember(cacheKey, async () => {
            // Build orderBy based on category
            const orderBy = (() => {
                switch (category) {
                    case 'academic':
                        return { academicRating: 'desc' };
                    case 'sports':
                        return { sportsRating: 'desc' };
                    case 'infrastructure':
                        return { infrastructureRating: 'desc' };
                    case 'overall':
                    default:
                        return { overallRating: 'desc' };
                }
            })();

            // Build where clause to exclude zero scores
            const whereClause = {
                isPubliclyVisible: true,
                ...(category === 'academic' && { academicRating: { gt: 0 } }),
                ...(category === 'sports' && { sportsRating: { gt: 0 } }),
                ...(category === 'infrastructure' && { infrastructureRating: { gt: 0 } }),
                ...(category === 'overall' && { overallRating: { gt: 0 } }),
            };

            // Fetch top schools
            const schools = await prisma.schoolPublicProfile.findMany({
                where: whereClause,
                orderBy,
                take: limit,
                select: {
                    id: true,
                    schoolId: true,
                    overallRating: true,
                    academicRating: true,
                    sportsRating: true,
                    infrastructureRating: true,
                    totalStudents: true,
                    totalTeachers: true,
                    studentTeacherRatio: true,
                    school: {
                        select: {
                            name: true,
                            location: true,
                            profilePicture: true,
                        }
                    },
                    badges: {
                        select: {
                            badgeType: true,
                            // year: true // Optional if you want year
                        }
                    },
                    _count: {
                        select: {
                            achievements: true,
                        }
                    }
                }
            });

            // Add rank to each school
            const rankedSchools = schools.map((school, index) => ({
                ...school,
                rank: index + 1,
                score: (() => {
                    switch (category) {
                        case 'academic':
                            return school.academicRating;
                        case 'sports':
                            return school.sportsRating;
                        case 'infrastructure':
                            return school.infrastructureRating;
                        case 'overall':
                        default:
                            return school.overallRating;
                    }
                })()
            }));

            // Return the structure expected by the frontend
            return {
                category,
                schools: rankedSchools,
                total: schools.length,
            };
        }, 30); // 30 seconds cache

        return NextResponse.json(result);

    } catch (error) {
        console.error('[LEADERBOARD API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
}
