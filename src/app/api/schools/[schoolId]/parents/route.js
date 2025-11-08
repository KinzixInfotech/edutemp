import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    try {
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

        const [parents, total] = await Promise.all([
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
                                    admissionNo: true,
                                    class: { select: { className: true } },
                                    section: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.parent.count({ where }),
        ]);

        return NextResponse.json({ parents, total });
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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[PARENTS_DELETE]", error);
        return NextResponse.json(
            { error: "Failed to delete parents" },
            { status: 500 }
        );
    }
}