import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH - Update SEL Parameter
export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, id } = params;
    const body = await req.json();
    const { name, description, category } = body;

    if (!schoolId || !id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        const updated = await prisma.sELParameter.update({
            where: { id: Number(id) },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(category && { category }),
            }
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Error updating SEL parameter:", err);
        return NextResponse.json(
            { error: "Failed to update SEL parameter" },
            { status: 500 }
        );
    }
}

// DELETE - Soft Delete SEL Parameter
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, id } = params;

    if (!schoolId || !id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        await prisma.sELParameter.update({
            where: { id: Number(id) },
            data: { isActive: false }
        });

        return NextResponse.json({ message: "SEL parameter deleted" });
    } catch (err) {
        console.error("Error deleting SEL parameter:", err);
        return NextResponse.json(
            { error: "Failed to delete SEL parameter" },
            { status: 500 }
        );
    }
}
