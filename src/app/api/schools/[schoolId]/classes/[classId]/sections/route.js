import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

export async function POST(req, props) {
    const params = await props.params;
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

        // Invalidate classes cache so the table shows the new section immediately
        await invalidatePattern(`classes:*schoolId:${schoolId}*`);

        return NextResponse.json(section, { status: 201 });
    } catch (error) {
        console.error("Error creating section:", error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "A section with that name already exists in this class" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
    }
}
export async function GET(req, props) {
    try {
        const params = await props.params;
        const { classId } = params;

        const sections = await prisma.section.findMany({
            where: {
                classId: parseInt(classId, 10),
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json(sections, { status: 200 });
    } catch (error) {
        console.error("Error fetching sections:", error);
        return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
    }
}