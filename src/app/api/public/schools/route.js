// Public API: List all schools with filters
// No authentication required - public endpoint

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        // Pagination
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');
        const skip = (page - 1) * limit;

        // Filters
        const search = searchParams.get('search') || '';
        const minFee = searchParams.get('minFee') ? parseInt(searchParams.get('minFee')) : undefined;
        const maxFee = searchParams.get('maxFee') ? parseInt(searchParams.get('maxFee')) : undefined;
        const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')) : undefined;
        const location = searchParams.get('location') || '';
        const sort = searchParams.get('sort') || 'name'; // name, rating, fees

        // Generate cache key based on all parameters
        const cacheKey = generateKey('public-schools', {
            page,
            limit,
            search,
            minFee,
            maxFee,
            minRating,
            location,
            sort
        });

        // Use Redis cache with 5 minute TTL
        const result = await remember(cacheKey, async () => {
            // Build where clause
            const where = {
                isPubliclyVisible: true,
                ...(search && {
                    OR: [
                        { school: { name: { contains: search, mode: 'insensitive' } } },
                        { school: { location: { contains: search, mode: 'insensitive' } } },
                        { tagline: { contains: search, mode: 'insensitive' } },
                    ]
                }),
                ...(location && {
                    school: { location: { contains: location, mode: 'insensitive' } }
                }),
                ...(minFee && { minFee: { gte: minFee } }),
                ...(maxFee && { maxFee: { lte: maxFee } }),
                ...(minRating && { overallRating: { gte: minRating } }),
            };

            // Build orderBy
            const orderBy = (() => {
                switch (sort) {
                    case 'rating':
                        return { overallRating: 'desc' };
                    case 'fees':
                        return { minFee: 'asc' };
                    case 'name':
                    default:
                        return { school: { name: 'asc' } };
                }
            })();

            // Fetch schools with pagination
            const [schools, total] = await Promise.all([
                prisma.schoolPublicProfile.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        schoolId: true,
                        tagline: true,
                        description: true,
                        coverImage: true,
                        logoImage: true,
                        minFee: true,
                        maxFee: true,
                        establishedYear: true,
                        totalStudents: true,
                        totalTeachers: true,
                        studentTeacherRatio: true,
                        overallRating: true,
                        academicRating: true,
                        infrastructureRating: true,
                        sportsRating: true,
                        isFeatured: true,
                        isVerified: true,
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
                            },
                            take: 3,
                        },
                        _count: {
                            select: {
                                achievements: true,
                                facilities: true,
                            }
                        }
                    }
                }),
                prisma.schoolPublicProfile.count({ where })
            ]);

            return {
                schools,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                }
            };
        }, 300); // 5 minutes cache

        return NextResponse.json(result);

    } catch (error) {
        console.error('[PUBLIC SCHOOLS API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch schools' },
            { status: 500 }
        );
    }
}
