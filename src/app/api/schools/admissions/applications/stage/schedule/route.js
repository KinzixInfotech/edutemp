import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const scheduleSchema = z.object({
    applicationId: z.string().uuid(),
    stageId: z.string().uuid(),
    movedById: z.string().uuid().optional(),
    testDate: z.string().optional(), // date in YYYY-MM-DD
    testStartTime: z.string().optional(), // HH:mm
    testEndTime: z.string().optional(),
    testVenue: z.string().optional(),
    customMessage: z.string().optional(),
});

export async function POST(req) {
    try {
        const body = await req.json();
        const data = scheduleSchema.parse(body);

        // Convert date/time strings into JS Date objects
        const testDate = data.testDate ? new Date(data.testDate) : null;
        const startTime = data.testStartTime
            ? new Date(`${data.testDate}T${data.testStartTime}`)
            : null;
        const endTime = data.testEndTime
            ? new Date(`${data.testDate}T${data.testEndTime}`)
            : null;

        // Create new StageHistory entry for scheduling
        const schedule = await prisma.stageHistory.create({
            data: {
                applicationId: data.applicationId,
                stageId: data.stageId,
                movedById: data.movedById || null,
                notes: data.customMessage || "Test scheduled",
                testDate,
                testStartTime: startTime,
                testEndTime: endTime,
                testVenue: data.testVenue || null,
            },
        });

        return NextResponse.json({ success: true, schedule });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.errors }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const applicationId = searchParams.get("applicationId");

        if (!applicationId) {
            return NextResponse.json({ error: "applicationId is required" }, { status: 400 });
        }

        // Fetch the most recent test schedule for the application
        const schedule = await prisma.stageHistory.findFirst({
            where: {
                applicationId,
                testDate: { not: null }, // ensures we only get test records
            },
            orderBy: {
                movedAt: "desc", // get the latest scheduled test
            },
            select: {
                id: true,
                testDate: true,
                testStartTime: true,
                testEndTime: true,
                testVenue: true,
                notes: true,
                stage: { select: { name: true, id: true } },
                movedBy: { select: { name: true, id: true, email: true } },
            },
        });

        if (!schedule) {
            return NextResponse.json(
                { success: false, message: "No test scheduled for this application." },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, schedule });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// New schema for test result update
const testResultSchema = z.object({
    testResult: z.enum(["pass", "fail"]).optional(),
    testScore: z.number().optional(),
    notes: z.string().optional(),
});

export async function PUT(req) {
    try {
        const body = await req.json();
        const data = testResultSchema.parse(body);

        // Find the latest StageHistory for this application and stage
        const latestStageHistory = await prisma.stageHistory.findFirst({
            where: { applicationId: data.applicationId, stageId: data.stageId },
            orderBy: { movedAt: "desc" },
        });

        if (!latestStageHistory) {
            return NextResponse.json(
                { error: "No scheduled test found for this application and stage" },
                { status: 404 }
            );
        }

        // Update the latest StageHistory
        const updated = await prisma.stageHistory.update({
            where: { id: latestStageHistory.id }, // use .id here
            data: {
                testPassed:
                    data.testResult === "pass"
                        ? true
                        : data.testResult === "fail"
                            ? false
                            : null,
                testScore: data.testScore || null,
                notes: data.notes || null,
            },
        });

        return NextResponse.json({ success: true, updated });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.errors }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

}