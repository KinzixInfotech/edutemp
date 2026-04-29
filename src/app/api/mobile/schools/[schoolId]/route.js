import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enforceSchoolStateAccess } from '@/lib/school-account-state';

export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { schoolId } = await params; // ← await this

    if (!schoolId) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    const schoolAccess = await enforceSchoolStateAccess({ schoolId, method: req.method });
    if (!schoolAccess.ok) {
      return schoolAccess.response;
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        profilePicture: true,
        contactNumber: true,
        location: true,
        city: true,
        state: true
        // removed: pincode (doesn't exist in schema)
      }
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error("Error fetching school details for mobile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});