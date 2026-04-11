// Public API: Get single school profile details
// No authentication required - public endpoint
// Supports both slug and UUID lookup (optimized single query)

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';
import redis from '@/lib/redis';
import { isUUID } from '@/lib/slug-generator';
import { calculateSchoolRatingSummary } from '@/lib/school-rating';

function normalizeProfile(profile) {
    if (!profile) return profile;
    const reviewSummary = calculateSchoolRatingSummary(profile.ratings || []);

    return {
        ...profile,
        reviewSummary,
        overallRating: reviewSummary.overallRating || profile.overallRating || 0,
        academicRating: reviewSummary.academicRating || profile.academicRating || 0,
        infrastructureRating: reviewSummary.infrastructureRating || profile.infrastructureRating || 0,
        sportsRating: reviewSummary.sportsRating || profile.sportsRating || 0,
        school: profile.school || {
            name: profile.independentName || 'Unnamed School',
            location: profile.independentLocation || '',
            profilePicture: profile.independentLogo || profile.logoImage || '',
            contactNumber: profile.independentPhone || profile.publicPhone || '',
            atlas_classFrom: profile.independentClassFrom || null,
            atlas_classTo: profile.independentClassTo || null,
            classes: [],
        },
    };
}

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { id } = params; // Can be either slug or UUID (schoolId)

        const cacheControl = req.headers.get('cache-control') || '';
        const shouldBypassCache =
            process.env.NODE_ENV === 'development' ||
            cacheControl.includes('no-cache') ||
            cacheControl.includes('no-store');

        const cacheKey = generateKey('school-profile', { id });

        const fetchProfile = async () => {
            const isIdUUID = isUUID(id);

            const profile = await prisma.schoolPublicProfile.findFirst({
                where: {
                    AND: [
                        {
                            OR: [
                                ...(isIdUUID ? [{ schoolId: id }, { id }] : []),
                                { slug: id },
                            ],
                        },
                        {
                            OR: [
                                { isPubliclyVisible: true },
                                { listingSource: 'INDEPENDENT' },
                            ],
                        },
                    ],
                },
                include: getProfileIncludes(),
            });

            return profile;
        };

        const school = shouldBypassCache
            ? await fetchProfile()
            : await remember(cacheKey, fetchProfile, 600); // 10 minutes cache

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
        const viewIdentifier = school.schoolId || school.id;
        const viewKey = `view:${viewIdentifier}:${ip}:${today}`;

        // Check if this IP already viewed today (using Redis)
        const alreadyViewed = await redis.get(viewKey);

        if (!alreadyViewed) {
            // Increment view count (fire and forget - don't await)
            prisma.schoolPublicProfile.update({
                where: { id: school.id },
                data: { profileViews: { increment: 1 } }
            }).catch(err => console.error('[View count update failed]', err));

            // Mark this IP as viewed for today (expire after 24 hours)
            redis.set(viewKey, '1', { ex: 86400 }).catch(() => { });
        }

        return NextResponse.json(normalizeProfile(school));

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
                atlas_classFrom: true,
                atlas_classTo: true,
                classes: {
                    select: { className: true },
                    orderBy: { className: 'asc' },
                },
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
        ratings: {
            select: {
                overallRating: true,
                academicRating: true,
                infrastructureRating: true,
                teacherRating: true,
                sportsRating: true,
            },
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
