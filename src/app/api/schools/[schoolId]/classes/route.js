import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

// POST /api/schools/[schoolId]/classes
export async function POST(req, context) {
    const { schoolId } = context.params
    console.log(schoolId);
    const { name, section } = await req.json()

    if (!schoolId || !name || !section) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    try {
        // ✅ Check if school exists
        const schoolExists = await prisma.school.findUnique({
            where: { id: schoolId },
        })

        if (!schoolExists) {
            return NextResponse.json({ error: "School not found" }, { status: 404 })
        }

        // ✅ Create class with existing schoolId
        const createdClass = await prisma.class.create({
            data: {
                name,
                section,
                school: {
                    connect: { id: schoolId },
                },
            },
        })

        return NextResponse.json(createdClass)
    } catch (err) {
        console.error("[CLASS_CREATE]", err)
        return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
    }
}


// GET /api/schools/[schoolId]/classes
// fetch the classes and section
export async function GET(_, { params }) {
    const { schoolId } = params

    try {
        const classes = await prisma.class.findMany({
            where: { schoolId },
            orderBy: [{ name: "asc" }, { section: "asc" }],
        })

        return NextResponse.json(classes)
    } catch (err) {
        console.error("[CLASS_FETCH]", err)
        return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 })
    }
}
