import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = withSchoolAccess(async function GET(_req, { params }) {
  const { schoolId, batchId } = await params;

  const batch = await prisma.importBatch.findFirst({
    where: { id: batchId, schoolId },
    include: {
      history: true,
      academicYear: { select: { id: true, name: true, startDate: true, endDate: true, isActive: true } },
      creator: { select: { id: true, name: true, email: true } },
      items: { orderBy: { createdAt: "asc" }, take: 500 },
      resolutionIssues: {
        select: {
          id: true,
          studentId: true,
          category: true,
          suggestedAction: true,
          confidence: true,
          status: true,
          metadata: true,
          student: { select: { name: true, admissionNo: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  }

  return NextResponse.json({ batch });
});
