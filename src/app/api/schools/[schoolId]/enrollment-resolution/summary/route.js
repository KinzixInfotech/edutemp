import { withSchoolAccess } from "@/lib/api-auth";
import { countOpenEnrollmentIssues } from "@/lib/enrollment/session-enrollment";
import { NextResponse } from "next/server";

export const GET = withSchoolAccess(async function GET(req, { params }) {
  const { schoolId } = await params;
  const academicYearId = req.nextUrl.searchParams.get("academicYearId") || null;
  const { count, academicYear } = await countOpenEnrollmentIssues(schoolId, academicYearId);

  return NextResponse.json({
    count,
    academicYear,
    hasUnresolved: count > 0,
  });
});
