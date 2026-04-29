import { withSchoolAccess } from "@/lib/api-auth"; // Edubreezy Atlas Admin API
// SUPER_ADMIN only: List & create school marketplace profiles
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateSchoolSlug, generateUniqueSlug } from '@/lib/slug-generator';
import { invalidateSchoolMarketplaceCache } from '@/lib/cache';

function normalizeProfile(profile) {
  if (!profile) return profile;

  const normalizedSchool = profile.school || {
    id: null,
    name: profile.independentName || 'Unnamed School',
    location: profile.independentLocation || '',
    profilePicture: profile.independentLogo || profile.logoImage || '',
    contactNumber: profile.independentPhone || profile.publicPhone || '',
    schoolCode: null,
    domain: null,
    SubscriptionType: 'ATLAS_ONLY',
    atlas_classFrom: profile.independentClassFrom || null,
    atlas_classTo: profile.independentClassTo || null,
    principals: [],
    directors: []
  };

  return {
    ...profile,
    listingSource: profile.listingSource?.toLowerCase() || 'erp',
    school: normalizedSchool
  };
}

// GET — List all schools with their marketplace profiles
export const GET = withSchoolAccess(async function GET(req) {
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
      { independentName: { contains: search, mode: 'insensitive' } },
      { independentLocation: { contains: search, mode: 'insensitive' } },
      { tagline: { contains: search, mode: 'insensitive' } }];

    }

    if (visibility === 'visible') where.isPubliclyVisible = true;
    if (visibility === 'hidden') where.isPubliclyVisible = false;
    if (featured === 'yes') where.isFeatured = true;
    if (featured === 'no') where.isFeatured = false;
    if (verified === 'yes') where.isVerified = true;
    if (verified === 'no') where.isVerified = false;
    if (listingSource === 'erp') {
      where.listingSource = 'ERP';
    }
    if (listingSource === 'independent') {
      where.listingSource = 'INDEPENDENT';
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
            atlas_classFrom: true,
            atlas_classTo: true,
            schoolCode: true,
            domain: true,
            SubscriptionType: true,
            principals: {
              include: { user: { select: { name: true, email: true } } },
              take: 1
            },
            directors: {
              include: { user: { select: { name: true, email: true } } },
              take: 1
            }
          }
        },
        _count: {
          select: {
            inquiries: true,
            ratings: true,
            gallery: true,
            achievements: true,
            facilities: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.schoolPublicProfile.count({ where })]
    );

    // Stats
    const [totalListed, totalFeatured, totalVerified, totalViews] = await Promise.all([
    prisma.schoolPublicProfile.count({ where: { isPubliclyVisible: true } }),
    prisma.schoolPublicProfile.count({ where: { isFeatured: true } }),
    prisma.schoolPublicProfile.count({ where: { isVerified: true } }),
    prisma.schoolPublicProfile.aggregate({ _sum: { profileViews: true } })]
    );

    const [erpListed, independentListed] = await Promise.all([
    prisma.schoolPublicProfile.count({
      where: {
        isPubliclyVisible: true,
        listingSource: 'ERP'
      }
    }),
    prisma.schoolPublicProfile.count({
      where: {
        isPubliclyVisible: true,
        listingSource: 'INDEPENDENT'
      }
    })]
    );

    const totalViewsCount = totalViews._sum.profileViews || 0;
    const averageViews = totalListed > 0 ? Math.round(totalViewsCount / totalListed) : 0;

    const enrichedProfiles = profiles.map(normalizeProfile);

    return NextResponse.json({
      profiles: enrichedProfiles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1
      },
      stats: {
        totalListed,
        erpListed,
        independentListed,
        totalFeatured,
        totalVerified,
        averageViews
      }
    });
  } catch (error) {
    console.error('[ATLAS ADMIN API ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch atlas data' }, { status: 500 });
  }
});

// POST — Create or update a school's marketplace profile directly (SUPER_ADMIN bypass)
export const POST = withSchoolAccess(async function POST(req) {
  try {
    const body = await req.json();
    const { isNewSchool, newSchoolName, schoolId: providedSchoolId, location, ...profileData } = body;
    const atlasClassFrom = body.atlasClassFrom;
    const atlasClassTo = body.atlasClassTo;
    delete profileData.atlasClassFrom;
    delete profileData.atlasClassTo;

    let activeSchoolId = providedSchoolId;
    let schoolRecord = null;

    if (isNewSchool) {
      if (!newSchoolName || newSchoolName.trim().length === 0) {
        return NextResponse.json({ error: 'School name is required' }, { status: 400 });
      }
    } else {
      if (!activeSchoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
      }

      schoolRecord = await prisma.school.findUnique({ where: { id: activeSchoolId } });
      if (!schoolRecord) {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
      }

      if (typeof location === 'string' && location.trim()) {
        await prisma.school.update({
          where: { id: activeSchoolId },
          data: {
            location: location.trim(),
            atlas_classFrom: atlasClassFrom?.trim() || null,
            atlas_classTo: atlasClassTo?.trim() || null
          }
        });
        schoolRecord = {
          ...schoolRecord,
          location: location.trim(),
          atlas_classFrom: atlasClassFrom?.trim() || null,
          atlas_classTo: atlasClassTo?.trim() || null
        };
      } else if (atlasClassFrom !== undefined || atlasClassTo !== undefined) {
        await prisma.school.update({
          where: { id: activeSchoolId },
          data: {
            atlas_classFrom: atlasClassFrom?.trim() || null,
            atlas_classTo: atlasClassTo?.trim() || null
          }
        });
      }
    }

    const existingProfile = activeSchoolId ?
    await prisma.schoolPublicProfile.findUnique({
      where: { schoolId: activeSchoolId },
      select: { id: true, slug: true }
    }) :
    null;

    let finalSlug = existingProfile?.slug;
    if (!finalSlug) {
      const baseSlug = generateSchoolSlug(
        schoolRecord?.name || newSchoolName,
        location || schoolRecord?.location || profileData.independentLocation
      );
      if (baseSlug) {
        const existingSlugs = await prisma.schoolPublicProfile.findMany({
          where: { slug: { startsWith: baseSlug } },
          select: { slug: true }
        }).then((res) => res.map((r) => r.slug));
        finalSlug = generateUniqueSlug(baseSlug, existingSlugs);
      }
    }

    const createData = isNewSchool ?
    {
      ...profileData,
      slug: finalSlug,
      listingSource: 'INDEPENDENT',
      independentName: newSchoolName.trim(),
      independentLocation: location?.trim() || '',
      independentLogo: profileData.logoImage || '',
      independentPhone: profileData.publicPhone || '',
      independentClassFrom: atlasClassFrom?.trim() || null,
      independentClassTo: atlasClassTo?.trim() || null,
      isPubliclyVisible: profileData.isPubliclyVisible ?? true
    } :
    {
      schoolId: activeSchoolId,
      ...profileData,
      slug: finalSlug,
      listingSource: 'ERP',
      isPubliclyVisible: profileData.isPubliclyVisible ?? false
    };

    const updateData = isNewSchool ?
    {
      ...profileData,
      ...(finalSlug && { slug: finalSlug }),
      listingSource: 'INDEPENDENT',
      independentName: newSchoolName.trim(),
      independentLocation: location?.trim() || '',
      independentLogo: profileData.logoImage || '',
      independentPhone: profileData.publicPhone || '',
      independentClassFrom: atlasClassFrom?.trim() || null,
      independentClassTo: atlasClassTo?.trim() || null
    } :
    {
      ...profileData,
      ...(finalSlug && { slug: finalSlug })
    };

    const profile = isNewSchool || !activeSchoolId ?
    await prisma.schoolPublicProfile.create({
      data: createData,
      include: {
        school: {
          select: {
            id: true,
            name: true,
            location: true,
            profilePicture: true
          }
        }
      }
    }) :
    await prisma.schoolPublicProfile.upsert({
      where: { schoolId: activeSchoolId },
      create: createData,
      update: updateData,
      include: {
        school: {
          select: {
            id: true,
            name: true,
            location: true,
            profilePicture: true
          }
        }
      }
    });

    await invalidateSchoolMarketplaceCache(profile);

    return NextResponse.json({
      success: true,
      message: profile.createdAt === profile.updatedAt ? 'School listed on Atlas' : 'Atlas profile updated',
      profile: normalizeProfile(profile)
    });
  } catch (error) {
    console.error('[ATLAS ADMIN CREATE API ERROR]', error);
    return NextResponse.json({ error: 'Failed to save atlas profile' }, { status: 500 });
  }
});