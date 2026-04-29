import { withSchoolAccess } from "@/lib/api-auth"; // /app/api/schools/students/gender-count/[schoolId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;

  if (!schoolId) {
    return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let academicYearId = searchParams.get('academicYearId');

    // Auto-resolve active year
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true }
      });
      if (activeYear) academicYearId = activeYear.id;
    }

    const yearFilter = academicYearId ? { class: { academicYearId } } : {};

    // Group by gender to get male/female count
    const genderStats = await prisma.student.groupBy({
      by: ['gender'],
      _count: { gender: true },
      where: { schoolId, ...yearFilter }
    });

    // Total students
    const total = await prisma.student.count({ where: { schoolId, ...yearFilter } });

    const result = genderStats.reduce(
      (acc, curr) => {
        if (curr.gender === 'MALE') acc.male = curr._count.gender;else
        if (curr.gender === 'FEMALE') acc.female = curr._count.gender;
        return acc;
      },
      { male: 0, female: 0 }
    );

    return NextResponse.json({
      success: true,
      total,
      ...result
    });
  } catch (error) {
    console.error("❌ Gender count fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gender count" },
      { status: 500 }
    );
  }
});