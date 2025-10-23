import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req, { params }) {
    try {
        const { classId, schoolId } = params;
        const { name } = await req.json();

        const section = await prisma.section.create({
            data: {
                name,
                schoolId,
                classId: parseInt(classId, 10),  // convert to int
            },
        });

        return NextResponse.json(section, { status: 201 });
    } catch (error) {
        console.error("Error creating section:", error);
        return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
    }
}
