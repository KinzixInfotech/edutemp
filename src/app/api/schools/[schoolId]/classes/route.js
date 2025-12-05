import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils"
import { remember, generateKey, invalidatePattern } from "@/lib/cache"

// 👉 Create new class and automatically connect to active academic year
export async function POST(req) {
  try {
    const { name, schoolId, capacity } = await req.json()

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

    const newClass = await prisma.class.create({
      data: {
        className: name,
        schoolId,
        // capacity,
        // Automatically connect to the active academic year if it exists
        ...(activeAcademicYear && {
          academicYearId: activeAcademicYear.id,
        }),
      },
    })

    // Invalidate classes cache
    await invalidatePattern(`classes:${schoolId}*`)

    return NextResponse.json(newClass, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}

//Fetch classes with optional academicYearId filter and conditional AcademicYear inclusion
export async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params
    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId") // Optional filter by academicYearId
    const getAcademicYear = searchParams.get("getAcademicYear") === "true" // Check if getAcademicYear=true
    const getStudent = searchParams.get("getStudent") === "true"
    const showStructure = searchParams.get("showStructure") === "true"

    if (!schoolId) {
      return errorResponse("schoolId is required", 400)
    }

    const { page, limit, skip } = getPagination(req);
    const cacheKey = generateKey('classes', { schoolId, academicYearId, getAcademicYear, getStudent, showStructure, page, limit });

    const result = await remember(cacheKey, async () => {
      // If limit is -1, fetch all (useful for dropdowns)
      const isAll = limit === -1;

      const where = {
        schoolId,
        ...(academicYearId && { academicYearId }),
      };

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
          },
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
        classes = await prisma.class.findMany({ where, include });
        total = classes.length;
      } else {
        const paged = await paginate(prisma.class, { where, include }, page, limit);
        classes = paged.data;
        total = paged.meta.total;
      }

      //post process the count of fee structure to show the user that fee is assigned or not
      const processedClasses = await Promise.all(
        classes.map(async (cls) => {
          const assigned = await prisma.class.findFirst({
            where: {
              id: cls.id,
              academicYearId, //  match the year
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
          totalPages: Math.ceil(total / (limit === -1 ? total : limit)),
        }
      };

    }, 300); // Cache for 5 minutes

    // Return data array for backward compatibility
    // If isAll, result is array; otherwise result.data
    return apiResponse(Array.isArray(result) ? result : result.data);
  } catch (error) {
    console.error("[CLASS_GET_ERROR]", error)
    return errorResponse("Failed to fetch classes")
  }
}