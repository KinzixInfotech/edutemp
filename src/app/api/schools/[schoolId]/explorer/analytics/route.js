// Admin API: Get School Explorer Analytics
// Auth required - ADMIN only

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;

        // Fetch or create public profile for analytics
        const cacheKey = generateKey('school-explorer-analytics', { schoolId });

        const analytics = await remember(cacheKey, async () => {
            const profile = await prisma.schoolPublicProfile.findUnique({
                where: { schoolId },
                include: {
                    _count: {
                        select: {
                            achievements: true,
                            facilities: true,
                            badges: true,
                            gallery: true,
                            ratings: true,
                            inquiries: true,
                        }
                    },
                    inquiries: {
                        select: {
                            status: true,
                            createdAt: true,
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 100, // Last 100 inquiries for trends
                    }
                }
            });

            if (!profile) {
                return {
                    exists: false,
                    message: 'Public profile not created yet'
                };
            }

            // Calculate inquiry stats
            const totalInquiries = profile._count.inquiries;
            const newInquiries = profile.inquiries.filter(i => i.status === 'New').length;
            const convertedInquiries = profile.inquiries.filter(i => i.status === 'Converted').length;
            const conversionRate = totalInquiries > 0 ? (convertedInquiries / totalInquiries) * 100 : 0;

            // Monthly inquiry trend (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const monthlyTrend = {};
            profile.inquiries.forEach(inquiry => {
                if (inquiry.createdAt >= sixMonthsAgo) {
                    const month = inquiry.createdAt.toISOString().slice(0, 7); // YYYY-MM
                    if (!monthlyTrend[month]) monthlyTrend[month] = 0;
                    monthlyTrend[month]++;
                }
            });

            return {
                exists: true,
                profileId: profile.id,
                isPubliclyVisible: profile.isPubliclyVisible,
                isFeatured: profile.isFeatured,
                isVerified: profile.isVerified,

                // View Stats
                profileViews: profile.profileViews,

                // Ratings
                overallRating: profile.overallRating,
                academicRating: profile.academicRating,
                infrastructureRating: profile.infrastructureRating,
                sportsRating: profile.sportsRating,
                ratingsCount: profile._count.ratings,

                // Content Stats
                achievementsCount: profile._count.achievements,
                facilitiesCount: profile._count.facilities,
                badgesCount: profile._count.badges,
                galleryCount: profile._count.gallery,

                // Inquiry Stats
                inquiries: {
                    total: totalInquiries,
                    new: newInquiries,
                    converted: convertedInquiries,
                    conversionRate: Math.round(conversionRate * 10) / 10,
                    monthlyTrend: Object.entries(monthlyTrend).map(([month, count]) => ({
                        month,
                        count
                    })).sort((a, b) => a.month.localeCompare(b.month))
                },

                // Last updated
                lastUpdated: profile.updatedAt,
            };
        }, 120); // 2 minutes cache

        return NextResponse.json(analytics);

    } catch (error) {
        console.error('[SCHOOL EXPLORER ANALYTICS API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
