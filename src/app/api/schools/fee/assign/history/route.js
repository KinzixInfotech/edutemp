import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = withSchoolAccess(async function GET(req) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const academicYearId = searchParams.get("academicYearId") || undefined;

  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
  }

  const history = await prisma.feeAssignmentHistory.findMany({
    where: {
      schoolId,
      ...(academicYearId ? { academicYearId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ history });
});
