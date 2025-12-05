import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, parentId } = params;

    try {
        const cacheKey = generateKey('parents:detail', { schoolId, parentId });

        const parent = await remember(cacheKey, async () => {
            return await prisma.parent.findUnique({
                where: { id: parentId, schoolId },
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
                                    userId: true,
                                    name: true,
                                    admissionNo: true,
                                    rollNumber: true,
                                    class: { select: { className: true } },
                                    section: { select: { name: true } },
                                    user: {
                                        select: {
                                            profilePicture: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
        }, 300); // 5 minutes

        if (!parent) {
            return NextResponse.json({ error: "Parent not found" }, { status: 404 });
        }

        return NextResponse.json(parent);
    } catch (error) {
        console.error("[PARENT_GET]", error);
        return NextResponse.json(
            { error: "Failed to fetch parent" },
            { status: 500 }
        );
    }
}