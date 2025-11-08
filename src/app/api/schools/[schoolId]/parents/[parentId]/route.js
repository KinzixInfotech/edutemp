import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, parentId } = params;

    try {
        const parent = await prisma.parent.findUnique({
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