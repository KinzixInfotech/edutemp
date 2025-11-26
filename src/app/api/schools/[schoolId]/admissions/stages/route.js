import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch all stages for a school
export async function GET(req, { params }) {
    const { schoolId } = await params;

    try {
        const stages = await prisma.stage.findMany({
            where: { schoolId },
            orderBy: { order: "asc" },
        });

        return NextResponse.json(stages);
    } catch (error) {
        console.error("Error fetching stages:", error);
        return NextResponse.json(
            { error: "Failed to fetch stages" },
            { status: 500 }
        );
    }
}

// POST: Create a new stage
export async function POST(req, { params }) {
    const { schoolId } = await params;

    try {
        const body = await req.json();
        const { name, order, requiresTest, requiresInterview, feeRequired } = body;

        if (!name) {
            return NextResponse.json({ error: "Stage name is required" }, { status: 400 });
        }

        const stage = await prisma.stage.create({
            data: {
                schoolId,
                name,
                order: order || 0,
                requiresTest: requiresTest || false,
                requiresInterview: requiresInterview || false,
                feeRequired: feeRequired || false,
                type: "CUSTOM"
            },
        });

        return NextResponse.json(stage);
    } catch (error) {
        console.error("Error creating stage:", error);
        return NextResponse.json(
            { error: "Failed to create stage" },
            { status: 500 }
        );
    }
}

// PUT: Update a stage
export async function PUT(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("id");

    if (!stageId) {
        return NextResponse.json({ error: "Stage ID is required" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { name, order, requiresTest, requiresInterview, feeRequired } = body;

        const stage = await prisma.stage.update({
            where: { id: stageId, schoolId },
            data: {
                ...(name && { name }),
                ...(order !== undefined && { order }),
                ...(requiresTest !== undefined && { requiresTest }),
                ...(requiresInterview !== undefined && { requiresInterview }),
                ...(feeRequired !== undefined && { feeRequired }),
            },
        });

        return NextResponse.json(stage);
    } catch (error) {
        console.error("Error updating stage:", error);
        return NextResponse.json(
            { error: "Failed to update stage" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a stage
export async function DELETE(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("id");

    if (!stageId) {
        return NextResponse.json({ error: "Stage ID is required" }, { status: 400 });
    }

    try {
        await prisma.stage.delete({
            where: { id: stageId, schoolId },
        });

        return NextResponse.json({ message: "Stage deleted successfully" });
    } catch (error) {
        console.error("Error deleting stage:", error);
        return NextResponse.json(
            { error: "Failed to delete stage" },
            { status: 500 }
        );
    }
}
