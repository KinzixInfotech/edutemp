// Public API: School Reviews - GET (public) and POST (authenticated)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import supabaseServer from '@/lib/supabase-server'; // Use singleton

// Helper to resolve profileId from schoolId (params.id)
async function getProfileId(schoolId) {
    const profile = await prisma.schoolPublicProfile.findUnique({
        where: { schoolId },
        select: { id: true }
    });
    return profile?.id;
}

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { id: schoolId } = params; // params.id is schoolId

        // Resolve generic PublicProfile ID
        const profileId = await getProfileId(schoolId);
        if (!profileId) {
            return NextResponse.json({ error: 'School profile not found' }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        // Fetch reviews with pagination using profileId
        const [reviews, total] = await Promise.all([
            prisma.schoolRating.findMany({
                where: { profileId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.schoolRating.count({ where: { profileId } })
        ]);

        return NextResponse.json({
            reviews,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('[GET REVIEWS ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }
}

export async function POST(req, props) {
    try {
        const params = await props.params;
        const { id: schoolId } = params; // params.id is schoolId
        const body = await req.json();

        // 1. Check Supabase authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabaseServer.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
        }

        // 2. Find parent record with student links
        const parent = await prisma.parent.findFirst({
            where: { userId: user.id },
            include: {
                studentLinks: {
                    include: {
                        student: {
                            select: { schoolId: true }
                        }
                    }
                }
            }
        });

        if (!parent) {
            return NextResponse.json({
                error: 'Only parents can submit reviews'
            }, { status: 403 });
        }

        // 3. Verify parent belongs to this school
        // Look up the profile specifically to get both ID and Verify the specific schoolId
        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true, schoolId: true }
        });

        if (!profile) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        const studentInSchool = parent.studentLinks.some(
            link => link.student.schoolId === profile.schoolId
        );

        const isParentOfSchool = parent.schoolId === profile.schoolId;

        if (!isParentOfSchool && !studentInSchool) {
            console.log('[REVIEW CHECK FAILED]', {
                parentSchoolId: parent.schoolId,
                targetSchoolId: profile.schoolId,
                studentSchools: parent.studentLinks.map(l => l.student.schoolId)
            });
            return NextResponse.json({
                error: 'You can only review your child\'s school'
            }, { status: 403 });
        }

        // 4. Check for existing review (update vs create)
        const existingReview = await prisma.schoolRating.findUnique({
            where: {
                profileId_userId: {
                    profileId: profile.id, // Must use profile.id, NOT schoolId
                    userId: user.id
                }
            }
        });

        const reviewData = {
            userId: user.id,
            parentId: parent.id,
            isVerified: true,
            parentName: body.parentName || parent.name || parent.user?.name || 'Verified Parent',
            academicRating: body.academicRating,
            infrastructureRating: body.infrastructureRating,
            teacherRating: body.teacherRating,
            sportsRating: body.sportsRating,
            overallRating: body.overallRating,
            review: body.review || null,
        };

        let rating;
        if (existingReview) {
            // Update existing review
            rating = await prisma.schoolRating.update({
                where: { id: existingReview.id },
                data: reviewData
            });
        } else {
            // Create new review
            // CRITICAL FIX: Use profileId key, do NOT set 'id' manually
            rating = await prisma.schoolRating.create({
                data: {
                    profileId: profile.id,
                    ...reviewData
                }
            });
        }

        // 5. Recalculate school average ratings
        const allRatings = await prisma.schoolRating.findMany({
            where: { profileId: profile.id }, // Use profile.id
            select: {
                academicRating: true,
                infrastructureRating: true,
                sportsRating: true,
                overallRating: true
            }
        });

        const avgAcademic = allRatings.reduce((sum, r) => sum + r.academicRating, 0) / allRatings.length;
        const avgInfrastructure = allRatings.reduce((sum, r) => sum + r.infrastructureRating, 0) / allRatings.length;
        const avgSports = allRatings.reduce((sum, r) => sum + r.sportsRating, 0) / allRatings.length;
        const avgOverall = allRatings.reduce((sum, r) => sum + r.overallRating, 0) / allRatings.length;

        await prisma.schoolPublicProfile.update({
            where: { id: profile.id },
            data: {
                academicRating: avgAcademic,
                infrastructureRating: avgInfrastructure,
                sportsRating: avgSports,
                overallRating: avgOverall
            }
        });

        return NextResponse.json({
            rating,
            message: existingReview ? 'Review updated successfully' : 'Review submitted successfully'
        });

    } catch (error) {
        console.error('[POST REVIEW ERROR]', error);
        return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }
}
