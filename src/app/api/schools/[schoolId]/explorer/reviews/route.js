// Admin API: Manage school reviews
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Get profile ID
        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ reviews: [], total: 0 });
        }

        const [reviews, total] = await Promise.all([
            prisma.schoolRating.findMany({
                where: { profileId: profile.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.schoolRating.count({ where: { profileId: profile.id } })
        ]);

        return NextResponse.json({
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('[ADMIN GET REVIEWS ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }
}

export async function DELETE(req, props) {
    try {
        const { searchParams } = new URL(req.url);
        const reviewId = searchParams.get('id');

        if (!reviewId) {
            return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
        }

        // Get review info before deleting to recalculate averages
        const review = await prisma.schoolRating.findUnique({
            where: { id: reviewId },
            select: { profileId: true }
        });

        if (!review) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }

        // Delete the review
        await prisma.schoolRating.delete({
            where: { id: reviewId }
        });

        // Recalculate school average ratings
        const allRatings = await prisma.schoolRating.findMany({
            where: { profileId: review.profileId },
            select: {
                academicRating: true,
                infrastructureRating: true,
                sportsRating: true,
                overallRating: true
            }
        });

        if (allRatings.length > 0) {
            const avgAcademic = allRatings.reduce((sum, r) => sum + r.academicRating, 0) / allRatings.length;
            const avgInfrastructure = allRatings.reduce((sum, r) => sum + r.infrastructureRating, 0) / allRatings.length;
            const avgSports = allRatings.reduce((sum, r) => sum + r.sportsRating, 0) / allRatings.length;
            const avgOverall = allRatings.reduce((sum, r) => sum + r.overallRating, 0) / allRatings.length;

            await prisma.schoolPublicProfile.update({
                where: { id: review.profileId },
                data: {
                    academicRating: avgAcademic,
                    infrastructureRating: avgInfrastructure,
                    sportsRating: avgSports,
                    overallRating: avgOverall
                }
            });
        } else {
            // No reviews left, reset to defaults
            await prisma.schoolPublicProfile.update({
                where: { id: review.profileId },
                data: {
                    academicRating: 0,
                    infrastructureRating: 0,
                    sportsRating: 0,
                    overallRating: 0
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[DELETE REVIEW ERROR]', error);
        return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
    }
}
