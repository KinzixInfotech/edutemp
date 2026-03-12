import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    let {
        classId,
        sectionId,
        page = "1",
        limit = "10",
        search = "",
        sortBy = "newest" // newest, oldest, name_asc, name_desc
    } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 10;

    // Handle ALL / undefined filters
    const parsedClassId =
        classId && classId !== "ALL" && classId !== "" ? Number(classId) : undefined;
    const parsedSectionId =
        sectionId && sectionId !== "ALL" && sectionId !== "" ? Number(sectionId) : undefined;

    // Determine sort order
    let orderBy = {};
    switch (sortBy) {
        case "oldest":
            orderBy = { admissionDate: "asc" };
            break;
        case "name_asc":
            orderBy = { name: "asc" };
            break;
        case "name_desc":
            orderBy = { name: "desc" };
            break;
        case "newest":
        default:
            orderBy = { admissionDate: "desc" };
            break;
    }

    try {
        const whereClause = {
            schoolId,
            ...(parsedClassId ? { classId: parsedClassId } : {}),
            ...(parsedSectionId ? { sectionId: parsedSectionId } : {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                        { admissionNo: { contains: search, mode: "insensitive" } }
                    ]
                }
                : {})
        };

        const cacheKey = generateKey("students", {
            schoolId,
            page: pageNum,
            limit: limitNum,
            search,
            classId: parsedClassId || "ALL",
            sectionId: parsedSectionId || "ALL",
            sortBy,
        });

        const result = await remember(
            cacheKey,
            async () => {
                const skip = (pageNum - 1) * limitNum;

                const [students, total, activeCount] = await Promise.all([
                    prisma.student.findMany({
                        where: whereClause,
                        include: {
                            user: true,
                            class: { select: { className: true } },
                            section: { select: { name: true } },
                            studentParentLinks: {
                                include: {
                                    parent: {
                                        include: {
                                            user: { select: { email: true, profilePicture: true } }
                                        }
                                    }
                                }
                            }
                        },
                        orderBy,
                        skip,
                        take: limitNum
                    }),
                    prisma.student.count({ where: whereClause }),
                    prisma.student.count({
                        where: { schoolId, user: { status: "ACTIVE" } },
                    }),
                ]);

                return { students, total, activeCount };
            },
            300 // 5 minutes cache
        );

        return NextResponse.json(result);
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to fetch students", errormsg: err.message },
            { status: 500 }
        );
    }
}

