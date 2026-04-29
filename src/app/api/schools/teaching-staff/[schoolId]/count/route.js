import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;

  if (!schoolId) {
    return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
  }

  try {
    const count = await prisma.teachingStaff.count({
      where: { schoolId }
    });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error("❌ Error fetching teaching staff count:", error);
    return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
  }
});