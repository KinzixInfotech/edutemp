import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

export const GET = withSchoolAccess(async function GET(req) {
  try {
    const { page, limit, skip } = getPagination(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const subscription = searchParams.get('subscription') || '';

    // Build where clause
    const where = {
      ...(search && {
        OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { schoolCode: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } }]

      }),
      ...(subscription && subscription !== 'all' && {
        SubscriptionType: subscription
      })
    };

    const cacheKey = generateKey('schools:enhanced', { page, limit, search, subscription });

    const result = await remember(cacheKey, async () => {
      const [total, schools, statsResult] = await Promise.all([
      // Total count with filters
      prisma.school.count({ where }),

      // Paginated schools with counts
      prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          schoolCode: true,
          location: true,
          contactNumber: true,
          profilePicture: true,
          domain: true,
          SubscriptionType: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          freezeType: true,
          freezeReason: true,
          freezeStartedAt: true,
          freezeUntil: true,
          deletedAt: true,
          _count: {
            select: {
              Student: true,
              TeachingStaff: true,
              NonTeachingStaff: true,
              classes: true,
              users: true
            }
          }
        }
      }),

      // Global stats (not filtered by search)
      Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { status: 'ACTIVE' } }),
      prisma.school.count({ where: { status: 'PAST_DUE' } }),
      prisma.school.count({ where: { status: 'SUSPENDED' } }),
      prisma.school.count({ where: { status: 'TERMINATED' } }),
      prisma.student.count(),
      prisma.teachingStaff.count()]
      )]
      );

      const [totalSchools, activeSchools, pastDueSchools, suspendedSchools, terminatedSchools, totalStudents, totalTeachers] = statsResult;

      return {
        schools,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1
        },
        stats: {
          totalSchools,
          activeSchools,
          pastDueSchools,
          suspendedSchools,
          terminatedSchools,
          totalStudents,
          totalTeachers
        }
      };
    }, 120); // Cache 2 minutes

    return apiResponse(result);
  } catch (err) {
    console.error("[SCHOOLS_ENHANCED]", err);
    return errorResponse("Failed to fetch schools");
  }
});