import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const getSchema = z.object({
    schoolId: z.string().uuid(),
});

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const params = { schoolId: searchParams.get("schoolId") };
        const validated = getSchema.parse(params);
        const stages = await prisma.stage.findMany({
            where: { schoolId: validated.schoolId },
            select: {
                id: true,
                name: true,
                order: true,
                requiresTest: true,
                // createdAt: true,
                // updatedAt: true,
            },
            orderBy: { order: "asc" },
        });
        return NextResponse.json({ success: true, stages });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}