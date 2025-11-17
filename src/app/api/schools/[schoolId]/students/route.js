import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    console.log(schoolId);

    let {
        classId,
        sectionId,
        page = "1",
        limit = "10",
        search = ""
    } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    // ✅ Proper numeric conversion with fallback
    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (pageNum - 1) * limitNum;

    // ✅ Handle ALL / undefined filters
    const parsedClassId =
        classId && classId !== "ALL" ? Number(classId) : undefined;
    const parsedSectionId =
        sectionId && sectionId !== "ALL" ? Number(sectionId) : undefined;

    try {
        const whereClause = {
            schoolId, // ✅ ensure correct type (Int in Prisma)
            ...(parsedClassId ? { classId: parsedClassId } : {}),
            ...(parsedSectionId ? { sectionId: parsedSectionId } : {}),
            ...(search
                ? {
                    OR: [
                        { studentName: { contains: search, mode: "insensitive" } },
                        { admissionNo: { contains: search, mode: "insensitive" } }
                    ]
                }
                : {})
        };

        const students = await prisma.student.findMany({
            where: whereClause,
            include: {
                user: true,
                class: { select: { className: true } },
                section: { select: { name: true } }
            },
            skip,
            take: limitNum
        });

        const total = await prisma.student.count({
            where: whereClause
        });

        return NextResponse.json({ students, total });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to fetch students", errormsg: err.message },
            { status: 500 }
        );
    }
}
