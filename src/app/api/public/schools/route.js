// Public API: List all schools with filters
// No authentication required - public endpoint

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

function normalizeProfile(profile) {
    if (!profile) return profile;
    return {
        ...profile,
        school: profile.school || {
            name: profile.independentName || 'Unnamed School',
            location: profile.independentLocation || '',
            city: null,
            state: null,
            profilePicture: profile.independentLogo || profile.logoImage || '',
            contactNumber: profile.independentPhone || profile.publicPhone || '',
            classes: [],
        },
    };
}

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
        const featured = searchParams.get('featured') === 'true';
        const sort = searchParams.get('sort') || 'name';
        const prioritizeCovers = searchParams.get('prioritizeCovers') === 'true';

        // NEW filters
        const board = searchParams.get('board') || '';             // e.g. "CBSE"
        const genderType = searchParams.get('genderType') || '';   // "Boys" | "Girls" | "Co-ed"
        const religiousAffiliation = searchParams.get('religiousAffiliation') || '';
        // facilities & extracurriculars come as comma-separated strings
        const facilitiesParam = searchParams.get('facilities') || '';
        const extracurricularsParam = searchParams.get('extracurriculars') || '';
        const facilities = facilitiesParam ? facilitiesParam.split(',').map(f => f.trim()).filter(Boolean) : [];
        const extracurriculars = extracurricularsParam ? extracurricularsParam.split(',').map(e => e.trim()).filter(Boolean) : [];

        const cacheKey = generateKey('public-schools-v2', {
            page, limit, search, minFee, maxFee, minRating,
            location, featured, sort, board, genderType,
            prioritizeCovers,
            religiousAffiliation,
            facilities: facilities.join(','),
            extracurriculars: extracurriculars.join(','),
        });

        const result = await remember(cacheKey, async () => {
            // ── Search: hits name, location, city, state, district via atlas fields,
            //    tagline, and the public profile slug
            const searchConditions = search ? {
                OR: [
                    { school: { name: { contains: search, mode: 'insensitive' } } },
                    { school: { location: { contains: search, mode: 'insensitive' } } },
                    { school: { city: { contains: search, mode: 'insensitive' } } },
                    { school: { state: { contains: search, mode: 'insensitive' } } },
                    { school: { atlas_pincode: { contains: search, mode: 'insensitive' } } },
                    { independentName: { contains: search, mode: 'insensitive' } },
                    { independentLocation: { contains: search, mode: 'insensitive' } },
                    { tagline: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { slug: { contains: search, mode: 'insensitive' } },
                ]
            } : {};

            const locationConditions = location ? {
                OR: [
                    { school: { location: { contains: location, mode: 'insensitive' } } },
                    { school: { city: { contains: location, mode: 'insensitive' } } },
                    { school: { state: { contains: location, mode: 'insensitive' } } },
                    { independentLocation: { contains: location, mode: 'insensitive' } },
                ]
            } : {};

            // Board filter: SchoolPublicProfile.boards is String[]
            // Prisma array field filter: has (exact match, case-sensitive)
            // We do a has check — boards field is String[] in Prisma
            const boardCondition = board ? {
                boards: { has: board }
            } : {};

            const genderCondition = genderType ? { genderType } : {};

            const religiousCondition = religiousAffiliation ? {
                religiousAffiliation: { contains: religiousAffiliation, mode: 'insensitive' }
            } : {};

            const feeConditions = {
                ...(minFee !== undefined ? { minFee: { gte: minFee } } : {}),
                ...(maxFee !== undefined ? { maxFee: { lte: maxFee } } : {}),
            };

            const ratingCondition = minRating ? { overallRating: { gte: minRating } } : {};
            const featuredCondition = featured ? { isFeatured: true } : {};

            // Facilities filter: SchoolFacility has `name` field
            // We need profiles whose facilities include ALL selected ones
            const facilitiesCondition = facilities.length > 0 ? {
                facilities: {
                    some: {
                        name: { in: facilities, mode: 'insensitive' },
                        isAvailable: true,
                    }
                }
            } : {};

            // Extracurriculars: stored as SchoolFacility with category = "Sports" / "Cultural"
            // OR as badge types. Best approach: search facilities by name for extracurriculars too
            const extracurricularsCondition = extracurriculars.length > 0 ? {
                facilities: {
                    some: {
                        name: { in: extracurriculars, mode: 'insensitive' },
                    }
                }
            } : {};

            const where = {
                ...searchConditions,
                ...locationConditions,
                ...boardCondition,
                ...genderCondition,
                ...religiousCondition,
                ...feeConditions,
                ...ratingCondition,
                ...featuredCondition,
                ...facilitiesCondition,
                ...extracurricularsCondition,
            };

            const orderBy = (() => {
                switch (sort) {
                    case 'rating':
                        return { overallRating: 'desc' };
                    case 'fees_asc':
                        return { minFee: 'asc' };
                    case 'fees_desc':
                        return { minFee: 'desc' };
                    case 'name':
                    default:
                        return { school: { name: 'asc' } };
                }
            })();

            const select = {
                id: true,
                schoolId: true,
                slug: true,
                independentName: true,
                independentLocation: true,
                independentLogo: true,
                independentPhone: true,
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
                boards: true,
                genderType: true,
                religiousAffiliation: true,
                publicPhone: true,
                publicEmail: true,
                school: {
                    select: {
                        name: true,
                        location: true,
                        city: true,
                        state: true,
                        profilePicture: true,
                        classes: {
                            select: { className: true },
                            orderBy: { className: 'asc' },
                        },
                    }
                },
                badges: {
                    select: { badgeType: true },
                    take: 3,
                },
                facilities: {
                    select: { name: true, category: true, isAvailable: true },
                    where: { isAvailable: true },
                    take: 10,
                },
                _count: {
                    select: {
                        achievements: true,
                        facilities: true,
                        ratings: true,
                    }
                }
            };

            const [schools, total] = prioritizeCovers
                ? await Promise.all([
                    prisma.schoolPublicProfile.findMany({
                        where,
                        orderBy,
                        select,
                    }).then((profiles) =>
                        profiles
                            .sort((a, b) => {
                                const aHasCover = Boolean(a.coverImage?.trim());
                                const bHasCover = Boolean(b.coverImage?.trim());
                                if (aHasCover === bHasCover) return 0;
                                return aHasCover ? -1 : 1;
                            })
                            .slice(skip, skip + limit)
                    ),
                    prisma.schoolPublicProfile.count({ where })
                ])
                : await Promise.all([
                    prisma.schoolPublicProfile.findMany({
                        where,
                        orderBy,
                        skip,
                        take: limit,
                        select,
                    }),
                    prisma.schoolPublicProfile.count({ where })
                ]);

            return {
                schools: schools.map(normalizeProfile),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                }
            };
        }, 300); // 5 min cache

        return NextResponse.json(result);

    } catch (error) {
        console.error('[PUBLIC SCHOOLS API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch schools' },
            { status: 500 }
        );
    }
}
