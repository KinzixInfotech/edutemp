import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    try {
        const cacheKey = generateKey('parents:list', { schoolId, page, limit, search });

        const result = await remember(cacheKey, async () => {
            const skip = (page - 1) * limit;

            const where = {
                schoolId,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                        { contactNumber: { contains: search, mode: "insensitive" } },
                    ],
                }),
            };

            const [parents, total, activeCount] = await Promise.all([
                prisma.parent.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        user: {
                            select: {
                                email: true,
                                profilePicture: true,
                                status: true,
                            },
                        },
                        studentLinks: {
                            include: {
                                student: {
                                    select: {
                                        name: true,
                                        userId: true,
                                        admissionNo: true,
                                        class: { select: { className: true } },
                                        section: { select: { name: true } },
                                        user: { select: { profilePicture: true } },
                                    },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                }),
                prisma.parent.count({ where }),
                prisma.parent.count({
                    where: { schoolId, user: { status: "ACTIVE" } },
                }),
            ]);

            return { parents, total, activeCount, page, limit, totalPages: Math.ceil(total / limit) };
        }, 300); // 5 minutes cache

        return NextResponse.json(result);
    } catch (error) {
        console.error("[PARENTS_GET]", error);
        return NextResponse.json(
            { error: "Failed to fetch parents" },
            { status: 500 }
        );
    }
}

export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { parentIds } = await req.json();

    try {
        await prisma.$transaction([
            prisma.studentParentLink.deleteMany({
                where: { parentId: { in: parentIds } },
            }),
            prisma.parent.deleteMany({
                where: { id: { in: parentIds }, schoolId },
            }),
        ]);

        await invalidatePattern(`parents:*${schoolId}*`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[PARENTS_DELETE]", error);
        return NextResponse.json(
            { error: "Failed to delete parents" },
            { status: 500 }
        );
    }
}