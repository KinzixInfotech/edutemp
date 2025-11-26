import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST: Move application to a different stage
export async function POST(req, { params }) {
    const { id } = await params;

    try {
        const body = await req.json();
        const { stageId, movedById, stageData } = body;

        if (!stageId) {
            return NextResponse.json(
                { error: "stageId is required" },
                { status: 400 }
            );
        }

        // Update application's current stage
        const application = await prisma.application.update({
            where: { id },
            data: {
                currentStageId: stageId,
            },
        });

        // Create stage history entry
        await prisma.stageHistory.create({
            data: {
                applicationId: id,
                stageId,
                movedById,
                notes: stageData?.notes || stageData?.rejectionReason || null,
                testDate: stageData?.testDate ? new Date(stageData.testDate) : null,
                testStartTime: stageData?.testStartTime || null,
                testEndTime: stageData?.testEndTime || null,
                testVenue: stageData?.testVenue || null,
                testScore: stageData?.testScore ? Number(stageData.testScore) : null,
                testPassed: stageData?.testResult === "pass" ? true : stageData?.testResult === "fail" ? false : null,
            },
        });

        return NextResponse.json({ application });
    } catch (error) {
        console.error("Error moving application:", error);
        return NextResponse.json(
            { error: "Failed to move application" },
            { status: 500 }
        );
    }
}
