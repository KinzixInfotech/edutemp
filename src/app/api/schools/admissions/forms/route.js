import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const formSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    schoolId: z.string().uuid(),
    fields: z.array(
        z.object({
            name: z.string().min(1),
            type: z.string(),
            required: z.boolean().optional(),
            options: z.any().optional(),
            order: z.number(),
        })
    ).optional(),
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
                fields: true,
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

const getSchema = z.object({
    schoolId: z.string().uuid(),
    slug: z.string().optional().nullable(),
    id: z.string().uuid().optional().nullable(),
});

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