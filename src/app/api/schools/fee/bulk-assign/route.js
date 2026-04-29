import { withSchoolAccess } from "@/lib/api-auth"; /**
 * API Route: /api/schools/fee/bulk-assign
 * Method: POST
 * Description: Bulk assigns a fee structure to an entire class or section
 */

import { NextResponse } from "next/server";
import { generateClassLedger } from "@/lib/fee/ledger-engine";

export const POST = withSchoolAccess(async function POST(req) {
  try {
    const body = await req.json();
    const { schoolId, academicYearId, feeSessionId, feeStructureId, classId, sectionId, userId } = body;

    if (!schoolId || !academicYearId || !feeSessionId || !feeStructureId || !classId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const actorId = userId || "SYSTEM";

    const result = await generateClassLedger({
      schoolId,
      academicYearId,
      feeSessionId,
      feeStructureId,
      classId,
      sectionId,
      userId: actorId
    });

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error("Bulk Assign Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});