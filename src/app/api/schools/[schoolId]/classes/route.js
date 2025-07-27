import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"


// POST /api/schools/[schoolId]/classes
export async function POST(req, context) {
    const { schoolId } = context.params;
    const { name, sections } = await req.json(); // expect `sections` as array

    if (!schoolId || !name || !Array.isArray(sections) || sections.length === 0) {
        return new Response("Missing required fields", { status: 400 });
    }

    try {
        const createdClass = await prisma.class.create({
            data: {
                schoolId,
                className: name,
                sections: {
                    create: sections.map((sec) => ({ name: sec })),
                },
            },
            include: {
                sections: true,
            },
        });

        return Response.json(createdClass);
    } catch (error) {
        console.error("Error creating class:", error);
        return new Response("Failed to create class", { status: 500 });
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

