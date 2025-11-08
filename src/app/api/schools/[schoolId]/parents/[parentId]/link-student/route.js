import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, parentId } = params;
    const { studentId, relation = "GUARDIAN", isPrimary = false } = await req.json();

    try {
        // Check if link already exists
        const existing = await prisma.studentParentLink.findUnique({
            where: {
                studentId_parentId: {
                    studentId,
                    parentId,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Student already linked to this parent" },
                { status: 400 }
            );
        }

        // Create link
        const link = await prisma.studentParentLink.create({
            data: {
                studentId,
                parentId,
                relation,
                isPrimary,
            },
        });

        return NextResponse.json({ success: true, link });
    } catch (error) {
        console.error("[LINK_STUDENT]", error);
        return NextResponse.json(
            { error: "Failed to link student" },
            { status: 500 }
        );
    }
}

export async function DELETE(req, props) {
    const params = await props.params;
    const { parentId } = params;
    const { studentId } = await req.json();

    try {
        await prisma.studentParentLink.delete({
            where: {
                studentId_parentId: {
                    studentId,
                    parentId,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[UNLINK_STUDENT]", error);
        return NextResponse.json(
            { error: "Failed to unlink student" },
            { status: 500 }
        );
    }
}