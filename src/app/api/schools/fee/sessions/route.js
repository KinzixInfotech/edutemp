import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = withSchoolAccess(async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
      return NextResponse.json({ error: "School ID required" }, { status: 400 });
    }

    const sessions = await prisma.feeSession.findMany({
      where: { schoolId },
      include: {
        academicYear: true,
        _count: {
          select: {
            ledgerEntries: true,
            components: true
          }
        }
      },
      orderBy: {
        startMonth: 'desc'
      }
    });

    // Also fetch academic years for dropdown
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' }
    });

    return NextResponse.json({ success: true, sessions, academicYears });
  } catch (error) {
    console.error("Fee Sessions GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch fee sessions" }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(req) {
  try {
    const data = await req.json();
    const { schoolId, academicYearId, name, startMonth, endMonth, dueDayOfMonth } = data;

    if (!schoolId || !academicYearId || !name || !startMonth || !endMonth) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await prisma.feeSession.create({
      data: {
        schoolId,
        academicYearId,
        name,
        startMonth: new Date(startMonth),
        endMonth: new Date(endMonth),
        dueDayOfMonth: parseInt(dueDayOfMonth) || 10,
        isActive: true,
        isClosed: false
      }
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A fee session for this academic year already exists" }, { status: 409 });
    }
    console.error("Fee Session POST Error:", error);
    return NextResponse.json({ error: "Failed to create fee session" }, { status: 500 });
  }
});

export const PUT = withSchoolAccess(async function PUT(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const data = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await prisma.feeSession.update({
      where: { id },
      data: {
        name: data.name,
        startMonth: data.startMonth ? new Date(data.startMonth) : undefined,
        endMonth: data.endMonth ? new Date(data.endMonth) : undefined,
        dueDayOfMonth: data.dueDayOfMonth ? parseInt(data.dueDayOfMonth) : undefined,
        isActive: data.isActive
      }
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Fee Session PUT Error:", error);
    return NextResponse.json({ error: "Failed to update fee session" }, { status: 500 });
  }
});

export const PATCH = withSchoolAccess(async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    const data = await req.json();

    if (!id || !action) {
      return NextResponse.json({ error: "Session ID and action required" }, { status: 400 });
    }

    if (action === "close") {
      const session = await prisma.feeSession.update({
        where: { id },
        data: {
          isClosed: true,
          closedAt: new Date(),
          closedBy: data.userId || null
        }
      });
      return NextResponse.json({ success: true, session });
    }

    if (action === "open") {
      const session = await prisma.feeSession.update({
        where: { id },
        data: {
          isClosed: false,
          closedAt: null,
          closedBy: null
        }
      });
      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Fee Session PATCH Error:", error);
    return NextResponse.json({ error: "Failed to perform action on fee session" }, { status: 500 });
  }
});