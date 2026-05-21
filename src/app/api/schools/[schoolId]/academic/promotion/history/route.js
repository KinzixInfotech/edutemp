import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = withSchoolAccess(async function GET(req, { params }) {
  const { schoolId } = await params;
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
  const fromYearId = searchParams.get("fromYearId") || null;
  const toYearId = searchParams.get("toYearId") || null;

  const where = {
    schoolId,
    ...(fromYearId ? { fromAcademicYearId: fromYearId } : {}),
    ...(toYearId ? { toAcademicYearId: toYearId } : {}),
  };

  const [batches, total] = await Promise.all([
    prisma.promotionBatch.findMany({
      where,
      include: {
        fromYear: { select: { id: true, name: true } },
        toYear: { select: { id: true, name: true } },
        promoter: { select: { id: true, name: true, email: true } },
        histories: {
          take: 10,
          orderBy: { promotedAt: "desc" },
          include: {
            student: { select: { userId: true, name: true, admissionNo: true } },
            fromClass: { select: { id: true, className: true } },
            toClass: { select: { id: true, className: true } },
            fromSection: { select: { id: true, name: true } },
            toSection: { select: { id: true, name: true } },
          },
        },
        _count: { select: { histories: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.promotionBatch.count({ where }),
  ]);

  return NextResponse.json({ batches, total, page, limit });
});
