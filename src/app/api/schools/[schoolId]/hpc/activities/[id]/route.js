import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH - Update Activity Category
export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, id } = params;
    const body = await req.json();
    const { name, description } = body;

    if (!schoolId || !id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        const updated = await prisma.activityCategory.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
            }
        });

        return NextResponse.json(updated);
    } catch (err) {
        console.error("Error updating activity category:", err);
        return NextResponse.json(
            { error: "Failed to update activity category" },
            { status: 500 }
        );
    }
}

// DELETE - Soft Delete Activity Category
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, id } = params;

    if (!schoolId || !id) {
        return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    try {
        // Soft delete category and its activities
        await prisma.$transaction([
            prisma.activityCategory.update({
                where: { id },
                data: { isActive: false }
            }),
            prisma.activity.updateMany({
                where: { categoryId: id },
                data: { isActive: false }
            })
        ]);

        return NextResponse.json({ message: "Activity category deleted" });
    } catch (err) {
        console.error("Error deleting activity category:", err);
        return NextResponse.json(
            { error: "Failed to delete activity category" },
            { status: 500 }
        );
    }
}
