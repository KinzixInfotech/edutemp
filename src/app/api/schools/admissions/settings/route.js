import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch admission settings (stages)
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
        return NextResponse.json(
            { error: "schoolId is required" },
            { status: 400 }
        );
    }

    try {
        const stages = await prisma.stage.findMany({
            where: { schoolId },
            orderBy: { order: "asc" },
        });

        return NextResponse.json({ stages });
    } catch (error) {
        console.error("Error fetching stages:", error);
        return NextResponse.json(
            { error: "Failed to fetch stages" },
            { status: 500 }
        );
    }
}
