import { withSchoolAccess } from "@/lib/api-auth"; // FILE: app/api/schools/fee/ledger/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateStudentLedger, regenerateStudentLedger } from "@/lib/fee/ledger-engine";
import { calculateLateFees } from "@/lib/fee/late-fee-engine";
import { applyDiscount, waiveBalance } from "@/lib/fee/discount-engine";

// Map GlobalFeeParticular enums → FeeComponent enums
const TYPE_MAP = { MONTHLY: 'MONTHLY', ONE_TIME: 'ONE_TIME', ANNUAL: 'ANNUAL', TERM: 'TERM' };
const CATEGORY_MAP = { TUITION: 'FEE_TUITION', TRANSPORT: 'FEE_TRANSPORT', ACTIVITY: 'FEE_ACTIVITY', ADMISSION: 'FEE_ADMISSION', EXAMINATION: 'FEE_EXAMINATION', LIBRARY: 'FEE_LIBRARY', LABORATORY: 'FEE_LABORATORY', SPORTS: 'FEE_SPORTS', HOSTEL: 'FEE_HOSTEL', DEVELOPMENT: 'FEE_DEVELOPMENT', FINE: 'FEE_FINE', MISCELLANEOUS: 'FEE_MISCELLANEOUS' };
const CHARGE_MAP = { SESSION_START: 'CHARGE_SESSION_START', ON_ADMISSION: 'CHARGE_ON_ADMISSION', ON_PROMOTION: 'CHARGE_ON_PROMOTION', MONTHLY: 'CHARGE_MONTHLY' };

// ── Resolve or auto-create FeeSession from any ID ─────────────────────────────
async function resolveSession(idOrAcademicYearId) {
  if (!idOrAcademicYearId) return null;

  // 1. Direct FeeSession lookup
  let session = await prisma.feeSession.findUnique({ where: { id: idOrAcademicYearId } });
  if (session) return session;

  // 2. Treat as academicYearId
  session = await prisma.feeSession.findFirst({
    where: { academicYearId: idOrAcademicYearId, isClosed: false },
    orderBy: { createdAt: 'desc' }
  });
  if (session) return session;

  // 3. Auto-create from AcademicYear
  const ay = await prisma.academicYear.findUnique({ where: { id: idOrAcademicYearId } });
  if (!ay) return null;

  session = await prisma.feeSession.create({
    data: {
      schoolId: ay.schoolId,
      academicYearId: ay.id,
      name: ay.name,
      isActive: true,
      isClosed: false,
      startMonth: ay.startDate,
      endMonth: ay.endDate,
      dueDayOfMonth: 10
    }
  });
  console.log(`[Ledger] Auto-created FeeSession for "${ay.name}"`);
  return session;
}

// ── Sync FeeComponent from GlobalFeeParticular (THE ROOT FIX) ─────────────────
// The ledger engine uses FeeComponent, but fee structures store data as
// GlobalFeeParticular. This syncs them once per structure per session.
async function syncFeeComponents(feeStructureId, session) {
  if (!feeStructureId || !session) return 0;

  const existing = await prisma.feeComponent.count({
    where: { feeStructureId, feeSessionId: session.id }
  });
  if (existing > 0) return existing; // already synced

  const particulars = await prisma.globalFeeParticular.findMany({
    where: { globalFeeStructureId: feeStructureId },
    orderBy: { displayOrder: 'asc' }
  });
  if (!particulars.length) return 0;

  await prisma.feeComponent.createMany({
    data: particulars.map((p, i) => ({
      feeStructureId,
      feeSessionId: session.id,
      name: p.name,
      amount: p.amount,
      type: TYPE_MAP[p.type] || 'MONTHLY',
      category: CATEGORY_MAP[p.category] || 'FEE_TUITION',
      chargeTiming: CHARGE_MAP[p.chargeTiming] || 'CHARGE_MONTHLY',
      serviceId: p.serviceId || null,
      lateFeeRuleId: p.lateFeeRuleId || null,
      isOptional: p.isOptional || false,
      isActive: true,
      applicableMonths: p.applicableMonths ? JSON.parse(p.applicableMonths) : null,
      displayOrder: p.displayOrder ?? i
    })),
    skipDuplicates: true
  });

  console.log(`[Ledger] Synced ${particulars.length} FeeComponents from GlobalFeeParticular for structure ${feeStructureId}`);
  return particulars.length;
}

// ── Resolve feeStructureId from student if not passed ─────────────────────────
async function resolveStructureId(feeStructureId, studentId, academicYearId) {
  if (feeStructureId) return feeStructureId;
  if (!studentId) return null;
  const sf = await prisma.studentFee.findFirst({
    where: { studentId, academicYearId },
    select: { globalFeeStructureId: true }
  });
  return sf?.globalFeeStructureId || null;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export const GET = withSchoolAccess(async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const feeSessionId = searchParams.get("feeSessionId");
    const forceRecalculate = searchParams.get("forceRecalculate") === "true";

    if (!studentId || !feeSessionId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const session = await resolveSession(feeSessionId);
    if (!session) return NextResponse.json({ error: "Academic year not found" }, { status: 404 });

    await calculateLateFees(studentId, session.id, forceRecalculate);

    const ledger = await prisma.studentFeeLedger.findMany({
      where: { studentId, feeSessionId: session.id },
      include: {
        feeComponent: { select: { name: true, type: true, category: true, isOptional: true } }
      },
      orderBy: [{ month: "asc" }, { dueDate: "asc" }, { feeComponent: { displayOrder: "asc" } }]
    });

    const summary = ledger.reduce((acc, e) => {
      acc.totalOriginal += e.originalAmount;
      acc.totalDiscount += e.discountAmount;
      acc.totalLateFee += e.lateFeeAmount;
      acc.totalNet += e.netAmount;
      acc.totalPaid += e.paidAmount;
      acc.totalBalance += e.balanceAmount;
      return acc;
    }, { totalOriginal: 0, totalDiscount: 0, totalLateFee: 0, totalNet: 0, totalPaid: 0, totalBalance: 0 });

    return NextResponse.json({ success: true, ledger, summary });

  } catch (error) {
    console.error("Ledger GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// ── POST ──────────────────────────────────────────────────────────────────────
export const POST = withSchoolAccess(async function POST(req) {
  try {
    const body = await req.json();
    const { action, studentId, schoolId, academicYearId, feeSessionId, feeStructureId, joinDate, userId } = body;
    const actorId = userId || "SYSTEM";

    // 1. Resolve session (accepts either feeSessionId or academicYearId)
    const session = await resolveSession(feeSessionId || academicYearId);
    if (!session) return NextResponse.json({ error: "Academic year / fee session not found" }, { status: 404 });

    // 2. Resolve structure id (from param or student's assigned fee)
    const resolvedStructureId = await resolveStructureId(feeStructureId, studentId, session.academicYearId);

    // 3. ✅ Sync FeeComponent rows from GlobalFeeParticular — THE FIX
    if (resolvedStructureId) {
      await syncFeeComponents(resolvedStructureId, session);
    }

    if (action === "generate") {
      const result = await generateStudentLedger({
        studentId,
        schoolId: schoolId || session.schoolId,
        academicYearId: academicYearId || session.academicYearId,
        feeSessionId: session.id,
        feeStructureId: resolvedStructureId,
        joinDate: joinDate || new Date(),
        userId: actorId
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "regenerate") {
      const result = await regenerateStudentLedger({
        studentId,
        feeSessionId: session.id,
        feeStructureId: resolvedStructureId,
        userId: actorId
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action. Use generate or regenerate." }, { status: 400 });

  } catch (error) {
    console.error("Ledger POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// ── PATCH ─────────────────────────────────────────────────────────────────────
export const PATCH = withSchoolAccess(async function PATCH(req) {
  try {
    const body = await req.json();
    const { action, ledgerEntryId, discountAmount, reason, userId } = body;
    const actorId = userId || "SYSTEM";

    if (!ledgerEntryId) return NextResponse.json({ error: "Missing ledgerEntryId" }, { status: 400 });

    if (action === "discount") {
      if (discountAmount === undefined) return NextResponse.json({ error: "Missing discountAmount" }, { status: 400 });
      const result = await applyDiscount(ledgerEntryId, discountAmount, actorId, reason);
      return NextResponse.json({ success: true, updatedEntry: result });
    }

    if (action === "waive") {
      const result = await waiveBalance(ledgerEntryId, actorId, reason);
      return NextResponse.json({ success: true, updatedEntry: result });
    }

    return NextResponse.json({ error: "Invalid action. Use discount or waive." }, { status: 400 });

  } catch (error) {
    console.error("Ledger PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});