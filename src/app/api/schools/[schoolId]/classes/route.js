import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// File: app/api/classes/route.js
export async function POST(req) {
  try {
   const { name, schoolId, capacity } = await req.json()

    if (!name || !schoolId) {
      return NextResponse.json({ error: "Name and schoolId are required" }, { status: 400 });
    }

    const newClass = await prisma.class.create({
      data: {
        className:name,
        schoolId,
        capacity,
        // sections: sections?.length
        //   ? {
        //       create: sections.map((sec) => ({
        //         name: sec.name,
        //       })),
        //     }
        //   : undefined,
      },
      // include: { sections: true },
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}

// GET /api/schools/[schoolId]/classes
// fetch the classes and sections
// GET /api/schools/[schoolId]/classes
export async function GET(req, { params }) {
    const { schoolId } = params

    try {
        const classes = await prisma.class.findMany({
            where: { schoolId },
            include: {
                // supervisor: true, // Class teacher
                sections: {
                    include: {
                        subjectTeachers: {
                            include: { teacher: true, subject: true }
                        }
                    }
                }
            }
        })

        return NextResponse.json(classes)
    } catch (error) {
        console.error("[CLASS_GET_ERROR]", error)
        return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 })
    }
}