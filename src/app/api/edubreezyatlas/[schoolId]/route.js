import { withSchoolAccess } from "@/lib/api-auth"; // Edubreezy Atlas Admin — Single school profile API
// No authentication required - public endpoint (Wait, GET is public, PATCH/DELETE are protected)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateSchoolSlug, generateUniqueSlug, isPlaceholderSlug } from '@/lib/slug-generator';
import { invalidateSchoolMarketplaceCache } from '@/lib/cache';
import { calculateSchoolRatingSummary } from '@/lib/school-rating';

async function findProfile(identifier) {
  return prisma.schoolPublicProfile.findFirst({
    where: {
      OR: [
      { schoolId: identifier },
      { id: identifier },
      { slug: identifier }]

    },
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
          atlas_classFrom: true,
          atlas_classTo: true,
          schoolCode: true,
          domain: true,
          SubscriptionType: true,
          createdAt: true,
          principals: {
            include: { user: { select: { id: true, name: true, email: true, profilePicture: true } } }
          },
          directors: {
            include: { user: { select: { id: true, name: true, email: true, profilePicture: true } } }
          },
          _count: {
            select: {
              Student: true,
              TeachingStaff: true,
              NonTeachingStaff: true,
              classes: true
            }
          }
        }
      },
      _count: {
        select: {
          inquiries: true,
          ratings: true,
          gallery: true,
          achievements: true,
          facilities: true,
          badges: true
        }
      },
      ratings: {
        select: {
          overallRating: true,
          academicRating: true,
          infrastructureRating: true,
          teacherRating: true,
          sportsRating: true
        }
      },
      gallery: {
        select: { id: true, imageUrl: true, caption: true, category: true, displayOrder: true },
        orderBy: { displayOrder: 'asc' }
      },
      facilities: {
        select: { id: true, category: true, name: true, description: true, icon: true, isAvailable: true },
        orderBy: { category: 'asc' }
      },
      achievements: {
        select: { id: true, title: true, description: true, category: true, year: true, imageUrl: true, rank: true, level: true },
        orderBy: { year: 'desc' }
      },
      badges: {
        select: { id: true, badgeType: true, earnedAt: true, expiresAt: true }
      }
    }
  });
}

function normalizeProfile(profile) {
  if (!profile) return profile;
  return {
    ...profile,
    listingSource: profile.listingSource?.toLowerCase() || 'erp',
    school: profile.school || {
      id: null,
      name: profile.independentName || 'Unnamed School',
      location: profile.independentLocation || '',
      city: null,
      state: null,
      profilePicture: profile.independentLogo || profile.logoImage || '',
      contactNumber: profile.independentPhone || profile.publicPhone || '',
      schoolCode: null,
      domain: null,
      SubscriptionType: 'ATLAS_ONLY',
      atlas_classFrom: profile.independentClassFrom || null,
      atlas_classTo: profile.independentClassTo || null,
      createdAt: profile.createdAt,
      principals: [],
      directors: [],
      _count: {
        Student: 0,
        TeachingStaff: 0,
        NonTeachingStaff: 0,
        classes: 0
      }
    }
  };
}

// GET — Detailed school profile with analytics
export const GET = withSchoolAccess(async function GET(req, props) {
  try {
    const params = await props.params;
    const { schoolId } = params;

    const profile = await findProfile(schoolId);

    if (!profile) {
      return NextResponse.json({ error: 'Atlas profile not found for this school' }, { status: 404 });
    }

    const ratingSummary = calculateSchoolRatingSummary(profile.ratings);
    const avgRatings = ratingSummary.totalReviews > 0 ? {
      overall: ratingSummary.overallRating,
      academic: ratingSummary.academicRating,
      infrastructure: ratingSummary.infrastructureRating,
      teacher: ratingSummary.teacherRating,
      sports: ratingSummary.sportsRating,
      totalReviews: ratingSummary.totalReviews
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
        createdAt: true
      }
    });

    const [listedCount, viewsAggregate] = await Promise.all([
    prisma.schoolPublicProfile.count({
      where: { isPubliclyVisible: true }
    }),
    prisma.schoolPublicProfile.aggregate({
      _sum: { profileViews: true }
    })]
    );

    const totalViews = viewsAggregate._sum.profileViews || 0;
    const averageViews = listedCount > 0 ? Math.round(totalViews / listedCount) : 0;

    return NextResponse.json({
      ...normalizeProfile(profile),
      reviewSummary: ratingSummary,
      avgRatings,
      recentInquiries,
      averageViews
    });
  } catch (error) {
    console.error('[ATLAS DETAIL API ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch school detail' }, { status: 500 });
  }
});

// PATCH — Update school's atlas profile directly
export const PATCH = withSchoolAccess(async function PATCH(req, props) {
  try {
    const params = await props.params;
    const { schoolId: identifier } = params;
    const body = await req.json();

    // Remove non-profile fields
    const {
      school,
      _count,
      ratings,
      recentInquiries,
      avgRatings,
      reviewSummary,
      id,
      schoolId,
      createdAt,
      updatedAt,
      lastProfileUpdate,
      location,
      atlasClassFrom,
      atlasClassTo,
      ...updateData
    } = body;

    ['gallery', 'facilities', 'achievements'].forEach((relation) => {
      if (Array.isArray(updateData[relation])) {
        updateData[relation] = {
          deleteMany: {},
          create: updateData[relation].map(({ id, profileId, createdAt, updatedAt, ...rest }) => {
            // Cast specific fields to Int correctly
            if (relation === 'achievements') {
              if (rest.year) rest.year = parseInt(rest.year);
              if (rest.rank) rest.rank = parseInt(rest.rank);else
              rest.rank = null;
            }
            if (relation === 'gallery') {
              if (rest.displayOrder) rest.displayOrder = parseInt(rest.displayOrder);else
              rest.displayOrder = 0;
            }
            return rest;
          })
        };
      }
    });

    const profile = await prisma.$transaction(async (tx) => {
      const targetProfile = await tx.schoolPublicProfile.findFirst({
        where: {
          OR: [
          { schoolId: identifier },
          { id: identifier },
          { slug: identifier }]

        },
        select: {
          id: true,
          schoolId: true,
          slug: true,
          listingSource: true,
          independentName: true,
          independentLocation: true,
          school: { select: { name: true, location: true } }
        }
      });

      if (!targetProfile) {
        throw new Error('Atlas profile not found');
      }

      let finalLocation = location;
      if (targetProfile.schoolId && typeof location === 'string' && location.trim()) {
        await tx.school.update({
          where: { id: targetProfile.schoolId },
          data: {
            location: location.trim(),
            atlas_classFrom: atlasClassFrom?.trim() || null,
            atlas_classTo: atlasClassTo?.trim() || null
          }
        });
        finalLocation = location.trim();
      } else if (targetProfile.schoolId && (atlasClassFrom !== undefined || atlasClassTo !== undefined)) {
        await tx.school.update({
          where: { id: targetProfile.schoolId },
          data: {
            atlas_classFrom: atlasClassFrom?.trim() || null,
            atlas_classTo: atlasClassTo?.trim() || null
          }
        });
      } else if (typeof location === 'string') {
        finalLocation = location.trim();
        updateData.independentLocation = finalLocation;
      }

      if (!targetProfile.schoolId && (atlasClassFrom !== undefined || atlasClassTo !== undefined)) {
        updateData.independentClassFrom = atlasClassFrom?.trim() || null;
        updateData.independentClassTo = atlasClassTo?.trim() || null;
      }

      // Regenerate slug if missing, placeholder, or location updated
      const existingProfile = {
        slug: targetProfile.slug,
        school: targetProfile.school,
        independentName: targetProfile.independentName,
        independentLocation: targetProfile.independentLocation
      };

      const shouldRegenerate = !existingProfile?.slug ||
      isPlaceholderSlug(existingProfile.slug) ||
      location !== undefined && location !== (existingProfile.school?.location || existingProfile.independentLocation);

      if (shouldRegenerate && !updateData.slug) {
        const schoolName = existingProfile.school?.name || existingProfile.independentName || updateData.independentName;
        const schoolLocation = finalLocation || existingProfile.school?.location || existingProfile.independentLocation;
        const baseSlug = generateSchoolSlug(schoolName, schoolLocation);
        if (baseSlug) {
          const existingSlugs = await tx.schoolPublicProfile.findMany({
            where: { slug: { startsWith: baseSlug } },
            select: { slug: true }
          }).then((res) => res.map((r) => r.slug));
          const finalSlug = generateUniqueSlug(baseSlug, existingSlugs);
          updateData.slug = finalSlug;
        }
      }

      return tx.schoolPublicProfile.update({
        where: { id: targetProfile.id },
        data: updateData,
        include: {
          school: {
            select: {
              id: true,
              name: true,
              location: true,
              profilePicture: true,
              atlas_classFrom: true,
              atlas_classTo: true
            }
          }
        }
      });
    });

    await invalidateSchoolMarketplaceCache(profile);

    return NextResponse.json({
      success: true,
      message: 'Atlas profile updated successfully',
      profile: normalizeProfile(profile)
    });
  } catch (error) {
    console.error('[ATLAS UPDATE API ERROR]', error);
    return NextResponse.json({ error: 'Failed to update atlas profile' }, { status: 500 });
  }
});

// DELETE — Remove school from atlas marketplace
export const DELETE = withSchoolAccess(async function DELETE(req, props) {
  try {
    const params = await props.params;
    const { schoolId: identifier } = params;

    const profile = await prisma.schoolPublicProfile.findFirst({
      where: {
        OR: [
        { schoolId: identifier },
        { id: identifier },
        { slug: identifier }]

      },
      select: { id: true, schoolId: true, slug: true }
    });

    if (!profile) {
      return NextResponse.json({ error: 'Atlas profile not found' }, { status: 404 });
    }

    // Soft delete: set visibility to false instead of deleting
    const updatedProfile = await prisma.schoolPublicProfile.update({
      where: { id: profile.id },
      data: { isPubliclyVisible: false, isFeatured: false },
      select: { id: true, schoolId: true, slug: true }
    });

    await invalidateSchoolMarketplaceCache(updatedProfile);

    return NextResponse.json({
      success: true,
      message: 'School removed from Atlas marketplace'
    });
  } catch (error) {
    console.error('[ATLAS DELETE API ERROR]', error);
    return NextResponse.json({ error: 'Failed to remove school from Atlas' }, { status: 500 });
  }
});