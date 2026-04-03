// Edubreezy Atlas Admin API
// SUPER_ADMIN only: List & create school marketplace profiles
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateSchoolSlug, generateUniqueSlug } from '@/lib/slug-generator';

// GET — List all schools with their marketplace profiles
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const visibility = searchParams.get('visibility') || 'all';
        const featured = searchParams.get('featured') || 'all';
        const verified = searchParams.get('verified') || 'all';
        const listingSource = searchParams.get('listingSource') || 'all';

        const skip = (page - 1) * limit;

        // Build where clause for schools that have a public profile
        const where = {};

        if (search) {
            where.OR = [
                { school: { name: { contains: search, mode: 'insensitive' } } },
                { school: { location: { contains: search, mode: 'insensitive' } } },
                { tagline: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (visibility === 'visible') where.isPubliclyVisible = true;
        if (visibility === 'hidden') where.isPubliclyVisible = false;
        if (featured === 'yes') where.isFeatured = true;
        if (featured === 'no') where.isFeatured = false;
        if (verified === 'yes') where.isVerified = true;
        if (verified === 'no') where.isVerified = false;
        if (listingSource === 'erp') {
            where.school = {
                ...(where.school || {}),
                SubscriptionType: { not: 'ATLAS_ONLY' },
            };
        }
        if (listingSource === 'independent') {
            where.school = {
                ...(where.school || {}),
                SubscriptionType: 'ATLAS_ONLY',
            };
        }

        const [profiles, total] = await Promise.all([
            prisma.schoolPublicProfile.findMany({
                where,
                include: {
                    school: {
                        select: {
                            id: true,
                            name: true,
                            location: true,
                            profilePicture: true,
                            contactNumber: true,
                            schoolCode: true,
                            domain: true,
                            SubscriptionType: true,
                            principals: {
                                include: { user: { select: { name: true, email: true } } },
                                take: 1,
                            },
                            directors: {
                                include: { user: { select: { name: true, email: true } } },
                                take: 1,
                            },
                        },
                    },
                    _count: {
                        select: {
                            inquiries: true,
                            ratings: true,
                            gallery: true,
                            achievements: true,
                            facilities: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.schoolPublicProfile.count({ where }),
        ]);

        // Stats
        const [totalListed, totalFeatured, totalVerified, totalViews] = await Promise.all([
            prisma.schoolPublicProfile.count({ where: { isPubliclyVisible: true } }),
            prisma.schoolPublicProfile.count({ where: { isFeatured: true } }),
            prisma.schoolPublicProfile.count({ where: { isVerified: true } }),
            prisma.schoolPublicProfile.aggregate({ _sum: { profileViews: true } }),
        ]);

        const [erpListed, independentListed] = await Promise.all([
            prisma.schoolPublicProfile.count({
                where: {
                    isPubliclyVisible: true,
                    school: {
                        SubscriptionType: { not: 'ATLAS_ONLY' },
                    },
                },
            }),
            prisma.schoolPublicProfile.count({
                where: {
                    isPubliclyVisible: true,
                    school: {
                        SubscriptionType: 'ATLAS_ONLY',
                    },
                },
            }),
        ]);

        const totalViewsCount = totalViews._sum.profileViews || 0;
        const averageViews = totalListed > 0 ? Math.round(totalViewsCount / totalListed) : 0;

        const enrichedProfiles = profiles.map((profile) => ({
            ...profile,
            listingSource: profile.school?.SubscriptionType === 'ATLAS_ONLY' ? 'independent' : 'erp',
        }));

        return NextResponse.json({
            profiles: enrichedProfiles,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1,
            },
            stats: {
                totalListed,
                erpListed,
                independentListed,
                totalFeatured,
                totalVerified,
                averageViews,
            },
        });
    } catch (error) {
        console.error('[ATLAS ADMIN API ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch atlas data' }, { status: 500 });
    }
}

// POST — Create or update a school's marketplace profile directly (SUPER_ADMIN bypass)
export async function POST(req) {
    try {
        const body = await req.json();
        const { isNewSchool, newSchoolName, schoolId: providedSchoolId, location, ...profileData } = body;

        let activeSchoolId = providedSchoolId;

        // Auto-create a pseudo-school if 'isNewSchool' is true
        if (isNewSchool) {
            if (!newSchoolName || newSchoolName.trim().length === 0) {
                return NextResponse.json({ error: 'School name is required' }, { status: 400 });
            }
            
            const slugFriendlyName = newSchoolName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            const generatedDomain = `atlas-${slugFriendlyName}-${Date.now().toString(36)}`;
            const generatedSchoolCode = `ATLAS-${Math.floor(100000 + Math.random() * 900000)}`;

            const newSchool = await prisma.school.create({
                data: {
                    name: newSchoolName.trim(),
                    domain: generatedDomain.substring(0, 190), // ensure it fits length constraints
                    schoolCode: generatedSchoolCode,
                    profilePicture: profileData.logoImage || '',
                    location: location?.trim() || 'Not Specified',
                    contactNumber: profileData.publicPhone || 'Not Provided',
                    SubscriptionType: 'ATLAS_ONLY',
                    Language: 'en',
                }
            });
            activeSchoolId = newSchool.id;
        } else {
            if (!activeSchoolId) {
                return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
            }

            // Verify school exists
            const school = await prisma.school.findUnique({ where: { id: activeSchoolId } });
            if (!school) {
                return NextResponse.json({ error: 'School not found' }, { status: 404 });
            }

            if (typeof location === 'string' && location.trim()) {
                await prisma.school.update({
                    where: { id: activeSchoolId },
                    data: { location: location.trim() },
                });
            }
        }

            const existingProfile = await prisma.schoolPublicProfile.findUnique({
                where: { schoolId: activeSchoolId },
                select: { slug: true }
            });

            // Upsert the public profile
            // Generate a unique slug if there is no existing slug, or if we are creating a new one
            let finalSlug = existingProfile?.slug;
            if (!finalSlug) {
                const schoolData = await prisma.school.findUnique({ where: { id: activeSchoolId } });
                const baseSlug = generateSchoolSlug(schoolData?.name || newSchoolName, location || schoolData?.location);
                if (baseSlug) {
                    const existingSlugs = await prisma.schoolPublicProfile.findMany({
                        where: { slug: { startsWith: baseSlug } },
                        select: { slug: true }
                    }).then(res => res.map(r => r.slug));
                    finalSlug = generateUniqueSlug(baseSlug, existingSlugs);
                }
            }

            const profile = await prisma.schoolPublicProfile.upsert({
                where: { schoolId: activeSchoolId },
                create: {
                    schoolId: activeSchoolId,
                    ...profileData,
                    slug: finalSlug,
                    isPubliclyVisible: profileData.isPubliclyVisible ?? (isNewSchool ? true : false),
                },
                update: {
                    ...profileData,
                    ...(finalSlug && { slug: finalSlug })
                },
                include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        profilePicture: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: profile.createdAt === profile.updatedAt ? 'School listed on Atlas' : 'Atlas profile updated',
            profile,
        });
    } catch (error) {
        console.error('[ATLAS ADMIN CREATE API ERROR]', error);
        return NextResponse.json({ error: 'Failed to save atlas profile' }, { status: 500 });
    }
}
