import { withSchoolAccess } from "@/lib/api-auth"; // /app/api/school/by-code/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = withSchoolAccess(async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("schoolcode");

  if (!code) {
    return NextResponse.json({ error: "School code is required" }, { status: 400 });
  }

  const school = await prisma.school.findUnique({
    where: { schoolCode: code },
    include: { publicProfile: true }
  });

  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  return NextResponse.json({ school });
});