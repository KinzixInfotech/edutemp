import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch all competencies for a school (optionally filter by subject)
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { subjectId, includeInactive = "false" } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const whereClause = {
            subject: { class: { schoolId } },
            ...(subjectId ? { subjectId: Number(subjectId) } : {}),
            ...(includeInactive === "true" ? {} : { isActive: true })
        };

        const competencies = await prisma.competency.findMany({
            where: whereClause,
            include: {
                subject: {
                    select: {
                        id: true,
                        subjectName: true,
                        class: { select: { className: true, id: true } }
                    }
                }
            },
            orderBy: [
                { subject: { class: { className: "asc" } } },
                { subject: { subjectName: "asc" } },
                { order: "asc" }
            ]
        });

        return NextResponse.json({ competencies });
    } catch (err) {
        console.error("Error fetching competencies:", err);
        return NextResponse.json(
            { error: "Failed to fetch competencies", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Create competencies for a subject
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { subjectId, competencies } = body;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    if (!subjectId || !competencies || !Array.isArray(competencies)) {
        return NextResponse.json(
            { error: "subjectId and competencies array are required" },
            { status: 400 }
        );
    }

    try {
        // Verify subject belongs to this school
        const subject = await prisma.subject.findFirst({
            where: {
                id: Number(subjectId),
                class: { schoolId }
            }
        });

        if (!subject) {
            return NextResponse.json(
                { error: "Subject not found in this school" },
                { status: 404 }
            );
        }

        // Create competencies in batch
        const createdCompetencies = await prisma.competency.createMany({
            data: competencies.map((comp, index) => ({
                subjectId: Number(subjectId),
                name: comp.name,
                description: comp.description || null,
                order: comp.order ?? index,
                isActive: true
            })),
            skipDuplicates: true
        });

        // Fetch created competencies
        const result = await prisma.competency.findMany({
            where: { subjectId: Number(subjectId) },
            orderBy: { order: "asc" }
        });

        return NextResponse.json({
            message: "Competencies created successfully",
            count: createdCompetencies.count,
            competencies: result
        });
    } catch (err) {
        console.error("Error creating competencies:", err);
        return NextResponse.json(
            { error: "Failed to create competencies", message: err.message },
            { status: 500 }
        );
    }
}

// PUT - Update a competency
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { id, name, description, order, isActive } = body;

    if (!schoolId || !id) {
        return NextResponse.json(
            { error: "School ID and competency ID are required" },
            { status: 400 }
        );
    }

    try {
        // Verify competency belongs to this school
        const existing = await prisma.competency.findFirst({
            where: {
                id,
                subject: { class: { schoolId } }
            }
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Competency not found in this school" },
                { status: 404 }
            );
        }

        const updated = await prisma.competency.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(order !== undefined && { order }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json({ competency: updated });
    } catch (err) {
        console.error("Error updating competency:", err);
        return NextResponse.json(
            { error: "Failed to update competency", message: err.message },
            { status: 500 }
        );
    }
}

// DELETE - Soft delete a competency
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { id } = searchParams;

    if (!schoolId || !id) {
        return NextResponse.json(
            { error: "School ID and competency ID are required" },
            { status: 400 }
        );
    }

    try {
        // Verify competency belongs to this school
        const existing = await prisma.competency.findFirst({
            where: {
                id,
                subject: { class: { schoolId } }
            }
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Competency not found in this school" },
                { status: 404 }
            );
        }

        // Soft delete by setting isActive to false
        await prisma.competency.update({
            where: { id },
            data: { isActive: false }
        });

        return NextResponse.json({ message: "Competency deleted successfully" });
    } catch (err) {
        console.error("Error deleting competency:", err);
        return NextResponse.json(
            { error: "Failed to delete competency", message: err.message },
            { status: 500 }
        );
    }
}
