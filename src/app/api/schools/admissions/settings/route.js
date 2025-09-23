import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const settingsSchema = z.object({
    schoolId: z.string().uuid(),
    stages: z.array(z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        order: z.number(),
        requiresTest: z.boolean(),
        requiresInterview: z.boolean(),
        feeRequired: z.boolean(),
    })),
});

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) {
        return NextResponse.json({ error: "schoolId required" }, { status: 400 });
    }
    try {
        const stages = await prisma.stage.findMany({
            where: { schoolId },
            select: { id: true, name: true, order: true, requiresTest: true, requiresInterview: true, feeRequired: true },
            orderBy: { order: "asc" },
        });
        return NextResponse.json({ success: true, stages });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const data = await req.json();
        const validated = settingsSchema.parse(data);
        const upsertStages = validated.stages.map((stage) => prisma.stage.upsert({
            where: { id: stage.id || "nonexistent" },
            update: stage,
            create: { ...stage, schoolId: validated.schoolId },
        }));
        await prisma.$transaction(upsertStages);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}