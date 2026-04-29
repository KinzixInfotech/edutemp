import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch admission settings (stages)
export const GET = withSchoolAccess(async function GET(req) {
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
      orderBy: { order: "asc" }
    });

    return NextResponse.json({ stages });
  } catch (error) {
    console.error("Error fetching stages:", error);
    return NextResponse.json(
      { error: "Failed to fetch stages" },
      { status: 500 }
    );
  }
});

// PATCH: Update global test settings for a stage
export const PATCH = withSchoolAccess(async function PATCH(req) {
  try {
    const body = await req.json();
    const { stageId, globalTestDate, globalTestStartTime, globalTestEndTime, globalTestVenue } = body;

    if (!stageId) {
      return NextResponse.json(
        { error: "stageId is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.stage.update({
      where: { id: stageId },
      data: {
        globalTestDate: globalTestDate ? new Date(globalTestDate) : null,
        globalTestStartTime: globalTestStartTime || null,
        globalTestEndTime: globalTestEndTime || null,
        globalTestVenue: globalTestVenue || null
      }
    });

    return NextResponse.json({ stage: updated });
  } catch (error) {
    console.error("Error updating global test settings:", error);
    return NextResponse.json(
      { error: "Failed to update global test settings" },
      { status: 500 }
    );
  }
});