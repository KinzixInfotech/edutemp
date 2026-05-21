import { withSchoolAccess } from "@/lib/api-auth";
import { getSchoolFeatureStateById } from "@/lib/school-feature-access";
import { NextResponse } from "next/server";

export const GET = withSchoolAccess(async function GET(_req, { params }) {
    const { schoolId } = await params;
    const resolved = await getSchoolFeatureStateById(schoolId);

    if (!resolved) {
        return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
        schoolId,
        schoolName: resolved.school?.name || null,
        ...resolved.state,
    });
});
