import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    const { schoolId } = params;
    const { classId, sectionId, page = 1, limit = 10 } = Object.fromEntries(req.nextUrl.searchParams);

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    const skip = (Number(page) - 1) * Number(limit);

    try {
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                ...(classId ? { classId: Number(classId) } : {}),
                ...(sectionId ? { sectionId: Number(sectionId) } : {}),
            },
            include: {
                user: true,
                class: { select: { className: true } },
                section: { select: { name: true } }, // <-- include only student's section
            },
            skip,
            take: Number(limit),
        });

        const total = await prisma.student.count({
            where: {
                schoolId,
                ...(classId ? { classId: Number(classId) } : {}),
                ...(sectionId ? { sectionId: Number(sectionId) } : {}),
            },
        });

        return NextResponse.json({ students, total });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}
