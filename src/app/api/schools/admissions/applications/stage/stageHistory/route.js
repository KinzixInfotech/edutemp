import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch stage history for test score
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");
    const stageId = searchParams.get("stageId");

    if (!applicationId || !stageId) {
        return NextResponse.json(
            { error: "applicationId and stageId are required" },
            { status: 400 }
        );
    }

    try {
        const test = await prisma.stageHistory.findFirst({
            where: {
                applicationId,
                stageId,
            },
            orderBy: { movedAt: "desc" },
            select: {
                testScore: true,
                testPassed: true,
                notes: true,
                testDate: true,
                testStartTime: true,
                testEndTime: true,
                testVenue: true,
            },
        });

        return NextResponse.json({ test: test || null });
    } catch (error) {
        console.error("Error fetching stage history:", error);
        return NextResponse.json(
            { error: "Failed to fetch stage history" },
            { status: 500 }
        );
    }
}
