import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH - Update Activity Item
export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, itemId } = params;
    const body = await req.json();
    const { name, description, isActive } = body;

    if (!schoolId || !itemId) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        const updated = await prisma.activity.update({
            where: { id: itemId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive }),
            }
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Error updating activity item:", err);
        return NextResponse.json(
            { error: "Failed to update activity item" },
            { status: 500 }
        );
    }
}

// DELETE - Soft Delete Activity Item
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, itemId } = params;

    if (!schoolId || !itemId) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        const deleted = await prisma.activity.update({
            where: { id: itemId },
            data: { isActive: false }
        });

        return NextResponse.json({ message: "Activity item deleted", deleted });
    } catch (err) {
        console.error("Error deleting activity item:", err);
        return NextResponse.json(
            { error: "Failed to delete activity item" },
            { status: 500 }
        );
    }
}
