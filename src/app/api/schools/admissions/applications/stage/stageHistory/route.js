import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validate query parameters
const getTestSchema = z.object({
    applicationId: z.string().uuid(),
    stageId: z.string().uuid(),
});

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const params = getTestSchema.parse({
            applicationId: searchParams.get("applicationId"),
            stageId: searchParams.get("stageId"),
        });

        // fetch the latest StageHistory entry for this application + stage
        const latestTest = await prisma.stageHistory.findFirst({
            where: { applicationId: params.applicationId, stageId: params.stageId },
            orderBy: { movedAt: "desc" },
            select: {
                id: true,
                testDate: true,
                testStartTime: true,
                testEndTime: true,
                testVenue: true,
                testPassed: true,
                testScore: true,
                notes: true,
                stage: { select: { id: true, name: true } },
                movedBy: { select: { id: true, name: true, email: true } },
            },
        });

        return NextResponse.json({ success: true, test: latestTest || null });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.errors }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}