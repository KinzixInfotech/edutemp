import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH - Update Competency
export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, id } = params;
    const body = await req.json();
    const { name, description, subjectId } = body;

    if (!schoolId || !id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        const updated = await prisma.competency.update({
            where: { id: Number(id) },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(subjectId && { subjectId: Number(subjectId) }),
            }
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Error updating competency:", err);
        return NextResponse.json(
            { error: "Failed to update competency" },
            { status: 500 }
        );
    }
}

// DELETE - Soft Delete Competency
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, id } = params;

    if (!schoolId || !id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        await prisma.competency.update({
            where: { id: Number(id) },
            data: { isActive: false }
        });

        return NextResponse.json({ message: "Competency deleted" });
    } catch (err) {
        console.error("Error deleting competency:", err);
        return NextResponse.json(
            { error: "Failed to delete competency" },
            { status: 500 }
        );
    }
}
