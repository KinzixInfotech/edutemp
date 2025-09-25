import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const formSchema = z.object({
    name: z.string().min(1, "Form name is required"),
    description: z.string().optional().nullable(),
    schoolId: z.string().uuid(),
    fields: z
        .array(
            z.object({
                name: z.string().min(1, "Field name is required"),
                type: z.string(),
                required: z.boolean().optional().default(false),
                options: z.any().optional(),
                order: z.number(),
            })
        )
        .optional()
        .default([]),
});

const getSchema = z.object({
    schoolId: z.string().uuid(),
    slug: z.string().optional().nullable(),
    id: z.string().uuid().optional().nullable(),
});

const updateSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1, "Form name is required"),
    description: z.string().optional().nullable(),
    schoolId: z.string().uuid(),
    fields: z
        .array(
            z.object({
                id: z.string().uuid().optional().nullable(), // For existing fields
                name: z.string().min(1, "Field name is required"),
                type: z.string(),
                required: z.boolean().optional().default(false),
                options: z.any().optional(),
                order: z.number(),
            })
        )
        .optional()
        .default([]),
});

export async function POST(req) {
    try {
        const data = await req.json();
        const validated = formSchema.parse(data);
        const form = await prisma.admissionForm.create({
            data: {
                ...validated,
                fields: {
                    create: validated.fields || [],
                },
            },
            select: {
                id: true,
                name: true,
                description: true,
                slug: true,
                createdAt: true,
                updatedAt: true,
                fields: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        required: true,
                        options: true,
                        order: true,
                    },
                    orderBy: { order: "asc" },
                },
            },
        });
        return NextResponse.json({ success: true, form });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const params = {
        schoolId: searchParams.get("schoolId"),
        slug: searchParams.get("slug"),
        id: searchParams.get("id"),
    };
    try {
        const validated = getSchema.parse(params);
        const where = { schoolId: validated.schoolId };
        if (validated.slug) where.slug = validated.slug;
        if (validated.id) where.id = validated.id;

        const forms = await prisma.admissionForm.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                slug: true,
                createdAt: true,
                updatedAt: true,
                fields: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        required: true,
                        options: true,
                        order: true,
                    },
                    orderBy: { order: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ success: true, forms });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id"); // extract from query
        const data = await req.json();

        const validated = updateSchema.parse({ id, ...data }); // merge id manually
        console.log("validated:", validated);

        // Fetch existing fields to determine which to update/delete
        const existingForm = await prisma.admissionForm.findUnique({
            where: { id: validated.id },
            include: { fields: true },
        });

        if (!existingForm) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }

        // Update the form and its fields
        const form = await prisma.admissionForm.update({
            where: { id: validated.id },
            data: {
                name: validated.name,
                description: validated.description,
                schoolId: validated.schoolId,
                fields: {
                    // Delete fields not in the updated list
                    deleteMany: {
                        id: { notIn: validated.fields.filter(f => f.id).map(f => f.id) },
                    },
                    // Update or create fields
                    upsert: validated.fields.map(field => ({
                        where: { id: field.id || "non-existent-id" }, // Use a dummy ID for new fields
                        update: {
                            name: field.name,
                            type: field.type,
                            required: field.required,
                            options: field.options,
                            order: field.order,
                        },
                        create: {
                            name: field.name,
                            type: field.type,
                            required: field.required,
                            options: field.options,
                            order: field.order,
                        },
                    })),
                },
            },
            select: {
                id: true,
                name: true,
                description: true,
                slug: true,
                createdAt: true,
                updatedAt: true,
                fields: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        required: true,
                        options: true,
                        order: true,
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        return NextResponse.json({ success: true, form });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id || !z.string().uuid().safeParse(id).success) {
            return NextResponse.json({ error: "Valid form ID is required" }, { status: 400 });
        }

        // Check if the form has associated applications
        const applicationCount = await prisma.application.count({
            where: { admissionFormId: id },
        });

        if (applicationCount > 0) {
            return NextResponse.json(
                { error: "Cannot delete form with associated applications" },
                { status: 400 }
            );
        }

        await prisma.admissionForm.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        if (err.code === "P2025") {
            // Prisma error for record not found
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}