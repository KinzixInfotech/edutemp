import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const stageSchema = z.object({
    schoolId: z.string().uuid(),
    name: z.string().min(1, "Stage name is required"),
    order: z.number().int().min(0, "Order must be a non-negative integer"),
    requiresTest: z.boolean().optional().default(false),
});

export async function POST(req) {
    try {
        const data = await req.json();
        console.log(data);
        
        const validated = stageSchema.parse(data);
        const stage = await prisma.stage.create({
            data: validated,
            select: {
                id: true,
                name: true,
                order: true,
                requiresTest: true,
                // createdAt: true,
                // updatedAt: true,
            },
        });
        return NextResponse.json({ success: true, stage });
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
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        const data = await req.json();
        const validated = stageSchema.parse(data); // no `id` here

        const stage = await prisma.stage.update({
            where: { id },
            data: {
                name: validated.name,
                order: validated.order,
                requiresTest: validated.requiresTest,
            },
            select: {
                id: true,
                name: true,
                order: true,
                requiresTest: true,
            },
        });

        return NextResponse.json({ success: true, stage });
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
        if (!id) throw new Error("Stage ID is required");
        await prisma.stage.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}