import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

const normalizeClassName = (value) => value?.trim().replace(/\s+/g, " ") || "";

const getClassStudentCount = (cls) => {
  if (typeof cls?._count?.students === "number") return cls._count.students;
  if (Array.isArray(cls?.students)) return cls.students.length;
  if (Array.isArray(cls?.sections)) {
    return cls.sections.reduce((sum, sec) => sum + (sec?._count?.students || 0), 0);
  }
  return 0;
};

const dedupeClassesByName = (classes = []) => {
  const deduped = new Map();

  for (const cls of classes) {
    const key = normalizeClassName(cls?.className).toLowerCase();
    if (!key) continue;

    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, cls);
      continue;
    }

    const existingStudents = getClassStudentCount(existing);
    const currentStudents = getClassStudentCount(cls);
    const existingSections = existing?.sections?.length || 0;
    const currentSections = cls?.sections?.length || 0;

    const shouldReplace =
    currentStudents > existingStudents ||
    currentStudents === existingStudents && currentSections > existingSections ||
    currentStudents === existingStudents && currentSections === existingSections && cls.id > existing.id;

    if (shouldReplace) {
      deduped.set(key, cls);
    }
  }

  return Array.from(deduped.values());
};

// 👉 Create new class and automatically connect to active academic year
export const POST = withSchoolAccess(async function POST(req, props) {
  const params = await props.params;
  try {
    const { schoolId: routeSchoolId } = params;
    const { name, schoolId: bodySchoolId, capacity, sections: sectionCount } = await req.json();
    const normalizedName = normalizeClassName(name);
    const schoolId = routeSchoolId || bodySchoolId;

    if (!normalizedName || !schoolId) {
      return NextResponse.json({ error: "Name and schoolId are required" }, { status: 400 });
    }

    // Fetch the active academic year for the given schoolId
    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true
      }
    });

    // Prevent duplicates for the active academic year, while also catching
    // legacy rows that may have been created without an academicYearId.
    const existingClass = await prisma.class.findFirst({
      where: {
        schoolId,
        className: { equals: normalizedName, mode: "insensitive" },
        ...(activeAcademicYear ?
        {
          OR: [
          { academicYearId: activeAcademicYear.id },
          { academicYearId: null }]

        } :
        {})
      },
      include: {
        sections: { orderBy: { name: "asc" } }
      }
    });

    if (existingClass) {
      return NextResponse.json(
        {
          error: `Class ${normalizedName} already exists for this school/academic year.`,
          existingClass
        },
        { status: 409 }
      );
    }

    // Use transaction to create class + sections in one go
    const result = await prisma.$transaction(async (tx) => {
      const newClass = await tx.class.create({
        data: {
          className: normalizedName,
          schoolId,
          capacity: capacity ? parseInt(capacity, 10) : null,
          ...(activeAcademicYear && {
            academicYearId: activeAcademicYear.id
          })
        }
      });

      // Auto-generate sections if requested (1 → A, 2 → A,B, etc.)
      const numSections = parseInt(sectionCount, 10) || 0;
      if (numSections > 0) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const sectionData = [];
        for (let i = 0; i < Math.min(numSections, 26); i++) {
          sectionData.push({
            name: letters[i],
            classId: newClass.id,
            schoolId
          });
        }
        await tx.section.createMany({ data: sectionData });
      }

      // Return with sections included
      return tx.class.findUnique({
        where: { id: newClass.id },
        include: {
          sections: { orderBy: { name: 'asc' } }
        }
      });
    });

    // Invalidate classes cache (schoolId is in the middle of sorted key params)
    await invalidatePattern(`classes:*schoolId:${schoolId}*`);
    await invalidatePattern('classes:stats*');

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
});

// Fetch classes with server-side search, filters, sort, and pagination
export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const getAcademicYear = searchParams.get("getAcademicYear") === "true";
    const getStudent = searchParams.get("getStudent") === "true";
    const showStructure = searchParams.get("showStructure") === "true";

    // Server-side search & filter params
    const search = searchParams.get("search")?.trim() || "";
    const teacherFilter = searchParams.get("teacherFilter") || "ALL"; // ALL | ASSIGNED | UNASSIGNED
    const capacityFilter = searchParams.get("capacityFilter") || "ALL"; // ALL | OVER | EMPTY
    const sort = searchParams.get("sort") || "name_asc"; // name_asc | name_desc

    if (!schoolId) {
      return errorResponse("schoolId is required", 400);
    }

    const { page, limit, skip } = getPagination(req);
    const hasPaginationParams = searchParams.has("page") || searchParams.has("limit");
    const noCache = searchParams.get("noCache") === "true";

    // If noCache, invalidate all classes cache for this school
    if (noCache) {
      await invalidatePattern(`classes:*schoolId:${schoolId}*`);
    }

    const cacheKey = generateKey('classes', {
      schoolId, academicYearId, getAcademicYear, getStudent, showStructure,
      page, limit, search, teacherFilter, capacityFilter, sort, hasPaginationParams
    });

    const result = await remember(cacheKey, async () => {
      const isAll = !hasPaginationParams || limit === -1;

      // Build where clause with optional search
      // Auto-filter by active academic year if no academicYearId provided
      let effectiveAcademicYearId = academicYearId;
      if (!effectiveAcademicYearId) {
        const activeYear = await prisma.academicYear.findFirst({
          where: { schoolId, isActive: true },
          select: { id: true }
        });
        if (activeYear) effectiveAcademicYearId = activeYear.id;
      }

      const where = {
        schoolId,
        ...(effectiveAcademicYearId && { academicYearId: effectiveAcademicYearId })
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
              { teachingStaff: { name: { contains: search, mode: "insensitive" } } }]

            }
          }
        }];

      }

      // Teacher filter: only classes that have at least one section matching the criteria
      if (teacherFilter === "ASSIGNED") {
        where.sections = {
          ...where.sections,
          some: { ...where.sections?.some, teachingStaffUserId: { not: null } }
        };
      } else if (teacherFilter === "UNASSIGNED") {
        where.sections = {
          ...where.sections,
          some: { ...where.sections?.some, teachingStaffUserId: null }
        };
      }

      // Determine sort order
      const orderBy = sort === "name_desc" ?
      { className: "desc" } :
      { className: "asc" };

      const include = {
        FeeStructure: {
          include: {
            feeParticulars: {
              include: {
                StudentFeeParticular: {
                  include: {
                    globalParticular: true
                  }
                }
              }
            }
          }
        },
        sections: {
          include: {
            subjectTeachers: {
              include: { teacher: true, subject: true }
            },
            teachingStaff: true,
            _count: {
              select: {
                students: true
              }
            }
          },
          orderBy: { name: "asc" }
        },
        ...(getAcademicYear && { AcademicYear: true }),
        ...(getStudent ?
        { students: true } :
        { _count: { select: { students: true, FeeStructure: true } } }),
        ...(showStructure && { FeeStructure: true })
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
          take: limit
        }),
        prisma.class.count({ where })]
        );
      }

      classes = dedupeClassesByName(classes);

      // Post-process: capacity filter (can't be done in Prisma where easily)
      if (capacityFilter === "OVER") {
        classes = classes.filter((cls) => {
          if (!cls.capacity) return false;
          return cls.sections?.some((sec) => (sec._count?.students || 0) > cls.capacity);
        });
        if (!isAll) total = classes.length; // adjust total for capacity-filtered results
      } else if (capacityFilter === "EMPTY") {
        classes = classes.filter((cls) => {
          return cls.sections?.some((sec) => (sec._count?.students || 0) === 0);
        });
        if (!isAll) total = classes.length;
      }

      // Post-process: fee structure assignment check
      const processedClasses = await Promise.all(
        classes.map(async (cls) => {
          const assigned = await prisma.class.findFirst({
            where: {
              id: cls.id,
              academicYearId
            },
            include: {
              FeeStructure: true
            }
          });

          return {
            ...cls,
            isStructureAssigned: !!assigned
          };
        })
      );

      if (isAll) return processedClasses;

      return {
        data: processedClasses,
        meta: {
          total: processedClasses.length,
          page,
          limit,
          totalPages: Math.ceil(processedClasses.length / (limit || 1))
        }
      };

    }, 300);

    // Return with meta for paginated requests, plain array for isAll
    if (Array.isArray(result)) {
      return apiResponse(result);
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CLASS_GET_ERROR]", error);
    return errorResponse("Failed to fetch classes");
  }
});