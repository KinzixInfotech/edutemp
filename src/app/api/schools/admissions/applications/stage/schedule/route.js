import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch test schedule for an application
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
        return NextResponse.json(
            { error: "applicationId is required" },
            { status: 400 }
        );
    }

    try {
        // Find the most recent stage history entry with test details
        const schedule = await prisma.stageHistory.findFirst({
            where: {
                applicationId,
                OR: [
                    { testDate: { not: null } },
                    { testVenue: { not: null } },
                ],
            },
            orderBy: { movedAt: "desc" },
            select: {
                testDate: true,
                testStartTime: true,
                testEndTime: true,
                testVenue: true,
                testScore: true,
                testPassed: true,
                notes: true,
            },
        });

        return NextResponse.json({ schedule: schedule || null });
    } catch (error) {
        console.error("Error fetching test schedule:", error);
        return NextResponse.json(
            { error: "Failed to fetch test schedule" },
            { status: 500 }
        );
    }
}

// POST: Schedule a test for an application
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            applicationId,
            stageId,
            movedById,
            testDate,
            testStartTime,
            testEndTime,
            testVenue,
            customMessage,
        } = body;

        if (!applicationId || !stageId) {
            return NextResponse.json(
                { error: "applicationId and stageId are required" },
                { status: 400 }
            );
        }

        // Create or update stage history with test details
        const schedule = await prisma.stageHistory.create({
            data: {
                applicationId,
                stageId,
                movedById,
                testDate: testDate ? new Date(testDate) : null,
                testStartTime,
                testEndTime,
                testVenue,
                notes: customMessage || null,
            },
        });

        return NextResponse.json({ schedule });
    } catch (error) {
        console.error("Error scheduling test:", error);
        return NextResponse.json(
            { error: "Failed to schedule test" },
            { status: 500 }
        );
    }
}

// PUT: Update test result
export async function PUT(req) {
    try {
        const body = await req.json();
        const { applicationId, stageId, testResult, testScore, notes } = body;

        if (!applicationId || !stageId) {
            return NextResponse.json(
                { error: "applicationId and stageId are required" },
                { status: 400 }
            );
        }

        // Find the stage history entry to update
        const existing = await prisma.stageHistory.findFirst({
            where: {
                applicationId,
                stageId,
            },
            orderBy: { movedAt: "desc" },
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Stage history not found" },
                { status: 404 }
            );
        }

        // Update the test result
        const updated = await prisma.stageHistory.update({
            where: { id: existing.id },
            data: {
                testScore: testScore ? Number(testScore) : null,
                testPassed: testResult === "pass" ? true : testResult === "fail" ? false : null,
                notes: notes || existing.notes,
            },
        });

        return NextResponse.json({ updated });
    } catch (error) {
        console.error("Error updating test result:", error);
        return NextResponse.json(
            { error: "Failed to update test result" },
            { status: 500 }
        );
    }
}
