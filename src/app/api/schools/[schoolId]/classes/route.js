import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

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
        capacity,
        // Automatically connect to the active academic year if it exists
        ...(activeAcademicYear && {
          academicYearId: activeAcademicYear.id,
        }),
        // sections: sections?.length
        //   ? {
        //       create: sections.map((sec) => ({
        //         name: sec.name,
        //       })),
        //     }
        //   : undefined,
      },
      // include: { sections: true },
    })

    return NextResponse.json(newClass, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}

//Fetch classes with optional academicYearId filter and conditional AcademicYear inclusion
export async function GET(req, { params }) {
  try {
    const { schoolId } = params
    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId") // Optional filter by academicYearId
    const getAcademicYear = searchParams.get("getAcademicYear") === "true" // Check if getAcademicYear=true
    const getStudent = searchParams.get("getStudent") === "true"
    const showStructure = searchParams.get("showStructure") === "true"
    if (!schoolId) {
      return NextResponse.json({ error: "schoolId is required" }, { status: 400 })
    }
    const classes = await prisma.class.findMany({
      where: {
        schoolId,
        ...(academicYearId && { academicYearId }),
      },
      include: {
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
      },
    });

    //post process the count of fee structure to show the user that fee is assigned or not

    const result = await Promise.all(
      classes.map(async (cls) => {
        const assigned = await prisma.class.findFirst({
          where: {
            id: cls.id,
            academicYearId, //  match the year

            // Student: {
            //   classId: cls.id, //  restrict to this class
            // },
            // feeParticulars: {
            //   some: {
            //     globalParticular: {
            //       feeStructure: {
            //         classId: cls.id, //  ensure the fee structure belongs to this class
            //       },
            //     },
            //   },
            // },
          },
          include: {
            FeeStructure: true,
          }
          // select: { id: true },
        });

        return {
          ...cls,
          isStructureAssigned: !!assigned,
        };
      })
    );
    return NextResponse.json(result)
  } catch (error) {
    console.error("[CLASS_GET_ERROR]", error)
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 })
  }
}