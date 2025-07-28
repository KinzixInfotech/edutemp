import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"


// POST /api/schools/[schoolId]/classes
export async function POST(req, {params}) {
    try {
        const { schoolId } = params
        const { name } = await req.json()

        if (!schoolId || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const newClass = await prisma.class.create({
            data: {
                schoolId,
                className: name,
            },
        })

        return NextResponse.json({ success: true, class: newClass }, { status: 201 })
    } catch (err) {
        console.error("[CLASS_CREATE]", err)
        return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
}



// GET /api/schools/[schoolId]/classes
// fetch the classes and section
// GET /api/schools/[schoolId]/classes
export async function GET(_, { params }) {
    const { schoolId } = params;

    try {
        const classes = await prisma.class.findMany({
            where: { schoolId },
            orderBy: { className: "asc" },
            include: {
                sections: {
                    orderBy: { name: "asc" },
                },
            },
        });

        return NextResponse.json(classes);
    } catch (err) {
        console.error("[CLASS_FETCH]", err);
        return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
    }
}

