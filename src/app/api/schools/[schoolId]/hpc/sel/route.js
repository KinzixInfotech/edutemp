import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch SEL parameters for a school
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { includeInactive = "false" } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const parameters = await prisma.sELParameter.findMany({
            where: {
                schoolId,
                ...(includeInactive === "true" ? {} : { isActive: true })
            },
            orderBy: [{ category: "asc" }, { order: "asc" }]
        });

        return NextResponse.json({ parameters });
    } catch (err) {
        console.error("Error fetching SEL parameters:", err);
        return NextResponse.json(
            { error: "Failed to fetch SEL parameters", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Create SEL parameters
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { parameters } = body;

    if (!schoolId || !parameters || !Array.isArray(parameters)) {
        return NextResponse.json(
            { error: "schoolId and parameters array are required" },
            { status: 400 }
        );
    }

    try {
        const created = await prisma.sELParameter.createMany({
            data: parameters.map((p, index) => ({
                schoolId,
                name: p.name,
                description: p.description || null,
                category: p.category || null,
                order: p.order ?? index
            })),
            skipDuplicates: true
        });

        const result = await prisma.sELParameter.findMany({
            where: { schoolId },
            orderBy: { order: "asc" }
        });

        return NextResponse.json({
            message: "SEL parameters created successfully",
            count: created.count,
            parameters: result
        });
    } catch (err) {
        console.error("Error creating SEL parameters:", err);
        return NextResponse.json(
            { error: "Failed to create SEL parameters", message: err.message },
            { status: 500 }
        );
    }
}

// PUT - Update SEL parameter
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { id, name, description, category, order, isActive } = body;

    if (!schoolId || !id) {
        return NextResponse.json(
            { error: "schoolId and parameter id are required" },
            { status: 400 }
        );
    }

    try {
        const updated = await prisma.sELParameter.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(category !== undefined && { category }),
                ...(order !== undefined && { order }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json({ parameter: updated });
    } catch (err) {
        console.error("Error updating SEL parameter:", err);
        return NextResponse.json(
            { error: "Failed to update SEL parameter", message: err.message },
            { status: 500 }
        );
    }
}
