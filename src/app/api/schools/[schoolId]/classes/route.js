import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils"
import { remember, generateKey, invalidatePattern } from "@/lib/cache"

// 👉 Create new class and automatically connect to active academic year
export async function POST(req) {
  try {
    const { name, schoolId, capacity, sections: sectionCount } = await req.json()

    if (!name || !schoolId) {
      return NextResponse.json({ error: "Name and schoolId are required" }, { status: 400 })
    }

    // Fetch the active academic year for the given schoolId
    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true,
      },
    })

    // Use transaction to create class + sections in one go
    const result = await prisma.$transaction(async (tx) => {
      const newClass = await tx.class.create({
        data: {
          className: name,
          schoolId,
          capacity: capacity ? parseInt(capacity, 10) : null,
          ...(activeAcademicYear && {
            academicYearId: activeAcademicYear.id,
          }),
        },
      })

      // Auto-generate sections if requested (1 → A, 2 → A,B, etc.)
      const numSections = parseInt(sectionCount, 10) || 0
      if (numSections > 0) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const sectionData = []
        for (let i = 0; i < Math.min(numSections, 26); i++) {
          sectionData.push({
            name: letters[i],
            classId: newClass.id,
            schoolId,
          })
        }
        await tx.section.createMany({ data: sectionData })
      }

      // Return with sections included
      return tx.class.findUnique({
        where: { id: newClass.id },
        include: {
          sections: { orderBy: { name: 'asc' } },
        },
      })
    })

    // Invalidate classes cache (schoolId is in the middle of sorted key params)
    await invalidatePattern(`classes:*schoolId:${schoolId}*`)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}

// Fetch classes with server-side search, filters, sort, and pagination
export async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params
    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId")
    const getAcademicYear = searchParams.get("getAcademicYear") === "true"
    const getStudent = searchParams.get("getStudent") === "true"
    const showStructure = searchParams.get("showStructure") === "true"

    // Server-side search & filter params
    const search = searchParams.get("search")?.trim() || ""
    const teacherFilter = searchParams.get("teacherFilter") || "ALL" // ALL | ASSIGNED | UNASSIGNED
    const capacityFilter = searchParams.get("capacityFilter") || "ALL" // ALL | OVER | EMPTY
    const sort = searchParams.get("sort") || "name_asc" // name_asc | name_desc

    if (!schoolId) {
      return errorResponse("schoolId is required", 400)
    }

    const { page, limit, skip } = getPagination(req);
    const noCache = searchParams.get("noCache") === "true";

    // If noCache, invalidate all classes cache for this school
    if (noCache) {
      await invalidatePattern(`classes:*schoolId:${schoolId}*`);
    }

    const cacheKey = generateKey('classes', {
      schoolId, academicYearId, getAcademicYear, getStudent, showStructure,
      page, limit, search, teacherFilter, capacityFilter, sort
    });

    const result = await remember(cacheKey, async () => {
      const isAll = limit === -1;

      // Build where clause with optional search
      const where = {
        schoolId,
        ...(academicYearId && { academicYearId }),
      };

      // If searching, match against class name, section name, or teacher name
      if (search) {
        where.OR = [
          { className: { contains: search, mode: "insensitive" } },
          {
            sections: {
              some: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { teachingStaff: { name: { contains: search, mode: "insensitive" } } },
                ]
              }
            }
          },
        ]
      }

      // Teacher filter: only classes that have at least one section matching the criteria
      if (teacherFilter === "ASSIGNED") {
        where.sections = {
          ...where.sections,
          some: { ...where.sections?.some, teachingStaffUserId: { not: null } },
        }
      } else if (teacherFilter === "UNASSIGNED") {
        where.sections = {
          ...where.sections,
          some: { ...where.sections?.some, teachingStaffUserId: null },
        }
      }

      // Determine sort order
      const orderBy = sort === "name_desc"
        ? { className: "desc" }
        : { className: "asc" }

      const include = {
        FeeStructure: {
          include: {
            feeParticulars: {
              include: {
                StudentFeeParticular: {
                  include: {
                    globalParticular: true,
                  }
                },
              }
            }
          }
        },
        sections: {
          include: {
            subjectTeachers: {
              include: { teacher: true, subject: true },
            },
            teachingStaff: true,
            _count: {
              select: {
                students: true
              }
            }
          },
          orderBy: { name: "asc" },
        },
        ...(getAcademicYear && { AcademicYear: true }),
        ...(getStudent
          ? { students: true }
          : { _count: { select: { students: true, FeeStructure: true } } }),
        ...(showStructure && { FeeStructure: true }),
      };

      let classes;
      let total;

      if (isAll) {
        classes = await prisma.class.findMany({ where, include, orderBy });
        total = classes.length;
      } else {
        [classes, total] = await Promise.all([
          prisma.class.findMany({
            where,
            include,
            orderBy,
            skip,
            take: limit,
          }),
          prisma.class.count({ where }),
        ]);
      }

      // Post-process: capacity filter (can't be done in Prisma where easily)
      if (capacityFilter === "OVER") {
        classes = classes.filter(cls => {
          if (!cls.capacity) return false
          return cls.sections?.some(sec => (sec._count?.students || 0) > cls.capacity)
        })
        if (!isAll) total = classes.length // adjust total for capacity-filtered results
      } else if (capacityFilter === "EMPTY") {
        classes = classes.filter(cls => {
          return cls.sections?.some(sec => (sec._count?.students || 0) === 0)
        })
        if (!isAll) total = classes.length
      }

      // Post-process: fee structure assignment check
      const processedClasses = await Promise.all(
        classes.map(async (cls) => {
          const assigned = await prisma.class.findFirst({
            where: {
              id: cls.id,
              academicYearId,
            },
            include: {
              FeeStructure: true,
            }
          });

          return {
            ...cls,
            isStructureAssigned: !!assigned,
          };
        })
      );

      if (isAll) return processedClasses;

      return {
        data: processedClasses,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / (limit || 1)),
        }
      };

    }, 300);

    // Return with meta for paginated requests, plain array for isAll
    if (Array.isArray(result)) {
      return apiResponse(result);
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CLASS_GET_ERROR]", error)
    return errorResponse("Failed to fetch classes")
  }
}