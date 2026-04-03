// Edubreezy Atlas Admin — Single school profile API
// No authentication required - public endpoint (Wait, GET is public, PATCH/DELETE are protected)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateSchoolSlug, generateUniqueSlug, isPlaceholderSlug } from '@/lib/slug-generator';

// GET — Detailed school profile with analytics
export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;

        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        city: true,
                        state: true,
                        profilePicture: true,
                        contactNumber: true,
                        schoolCode: true,
                        domain: true,
                        SubscriptionType: true,
                        createdAt: true,
                        principals: {
                            include: { user: { select: { id: true, name: true, email: true, profilePicture: true } } },
                        },
                        directors: {
                            include: { user: { select: { id: true, name: true, email: true, profilePicture: true } } },
                        },
                        _count: {
                            select: {
                                Student: true,
                                TeachingStaff: true,
                                NonTeachingStaff: true,
                                classes: true,
                            },
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
                        badges: true,
                    },
                },
                ratings: {
                    select: {
                        overallRating: true,
                        academicRating: true,
                        infrastructureRating: true,
                        sportsRating: true,
                    },
                },
                gallery: {
                    select: { id: true, imageUrl: true, caption: true, category: true, displayOrder: true },
                    orderBy: { displayOrder: 'asc' },
                },
                facilities: {
                    select: { id: true, category: true, name: true, description: true, icon: true, isAvailable: true },
                    orderBy: { category: 'asc' },
                },
                achievements: {
                    select: { id: true, title: true, description: true, category: true, year: true, imageUrl: true, rank: true, level: true },
                    orderBy: { year: 'desc' },
                },
                badges: {
                    select: { id: true, badgeType: true, earnedAt: true, expiresAt: true },
                },
            },
        });

        if (!profile) {
            return NextResponse.json({ error: 'Atlas profile not found for this school' }, { status: 404 });
        }

        // Calculate average ratings
        const ratingCount = profile.ratings.length;
        const avgRatings = ratingCount > 0 ? {
            overall: profile.ratings.reduce((s, r) => s + r.overallRating, 0) / ratingCount,
            academic: profile.ratings.reduce((s, r) => s + r.academicRating, 0) / ratingCount,
            infrastructure: profile.ratings.reduce((s, r) => s + r.infrastructureRating, 0) / ratingCount,
            sports: profile.ratings.reduce((s, r) => s + r.sportsRating, 0) / ratingCount,
        } : null;

        // Recent inquiries
        const recentInquiries = await prisma.admissionInquiry.findMany({
            where: { profileId: profile.id },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                studentName: true,
                parentName: true,
                parentPhone: true,
                preferredGrade: true,
                status: true,
                createdAt: true,
            },
        });

        const [listedCount, viewsAggregate] = await Promise.all([
            prisma.schoolPublicProfile.count({
                where: { isPubliclyVisible: true },
            }),
            prisma.schoolPublicProfile.aggregate({
                _sum: { profileViews: true },
            }),
        ]);

        const totalViews = viewsAggregate._sum.profileViews || 0;
        const averageViews = listedCount > 0 ? Math.round(totalViews / listedCount) : 0;

        return NextResponse.json({
            ...profile,
            avgRatings,
            recentInquiries,
            averageViews,
        });
    } catch (error) {
        console.error('[ATLAS DETAIL API ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch school detail' }, { status: 500 });
    }
}

// PATCH — Update school's atlas profile directly
export async function PATCH(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const body = await req.json();

        // Remove non-profile fields
        const { school, _count, ratings, recentInquiries, avgRatings, id, createdAt, updatedAt, lastProfileUpdate, location, ...updateData } = body;

        ['gallery', 'facilities', 'achievements'].forEach((relation) => {
            if (Array.isArray(updateData[relation])) {
                updateData[relation] = {
                    deleteMany: {},
                    create: updateData[relation].map(({ id, profileId, createdAt, updatedAt, ...rest }) => {
                        // Cast specific fields to Int correctly
                        if (relation === 'achievements') {
                            if (rest.year) rest.year = parseInt(rest.year);
                            if (rest.rank) rest.rank = parseInt(rest.rank);
                            else rest.rank = null;
                        }
                        if (relation === 'gallery') {
                            if (rest.displayOrder) rest.displayOrder = parseInt(rest.displayOrder);
                            else rest.displayOrder = 0;
                        }
                        return rest;
                    })
                };
            }
        });

        const profile = await prisma.$transaction(async (tx) => {
            let finalLocation = location;
            if (typeof location === 'string' && location.trim()) {
                await tx.school.update({
                    where: { id: schoolId },
                    data: { location: location.trim() },
                });
                finalLocation = location.trim();
            }

            // Regenerate slug if missing, placeholder, or location updated
            const existingProfile = await tx.schoolPublicProfile.findUnique({
                where: { schoolId },
                select: { slug: true, school: { select: { name: true, location: true } } }
            });

            const shouldRegenerate = !existingProfile?.slug || 
                                     isPlaceholderSlug(existingProfile.slug) || 
                                     (location !== undefined && location !== existingProfile.school.location);

            if (shouldRegenerate && existingProfile?.school && !updateData.slug) {
                const baseSlug = generateSchoolSlug(existingProfile.school.name, finalLocation || existingProfile.school.location);
                if (baseSlug) {
                    const existingSlugs = await tx.schoolPublicProfile.findMany({
                        where: { slug: { startsWith: baseSlug } },
                        select: { slug: true }
                    }).then(res => res.map(r => r.slug));
                    const finalSlug = generateUniqueSlug(baseSlug, existingSlugs);
                    updateData.slug = finalSlug;
                }
            }

            return tx.schoolPublicProfile.update({
                where: { schoolId },
                data: updateData,
                include: {
                    school: {
                        select: { id: true, name: true, location: true, profilePicture: true },
                    },
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: 'Atlas profile updated successfully',
            profile,
        });
    } catch (error) {
        console.error('[ATLAS UPDATE API ERROR]', error);
        return NextResponse.json({ error: 'Failed to update atlas profile' }, { status: 500 });
    }
}

// DELETE — Remove school from atlas marketplace
export async function DELETE(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;

        // Soft delete: set visibility to false instead of deleting
        await prisma.schoolPublicProfile.update({
            where: { schoolId },
            data: { isPubliclyVisible: false, isFeatured: false },
        });

        return NextResponse.json({
            success: true,
            message: 'School removed from Atlas marketplace',
        });
    } catch (error) {
        console.error('[ATLAS DELETE API ERROR]', error);
        return NextResponse.json({ error: 'Failed to remove school from Atlas' }, { status: 500 });
    }
}
