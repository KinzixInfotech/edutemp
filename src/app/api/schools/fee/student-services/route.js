// ═══════════════════════════════════════════════════════════════
// FILE: app/api/schools/fee/student-services/route.js
// Activate optional fee components for students
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addOptionalComponent } from "@/lib/fee/ledger-engine";

// ── POST: activate an optional fee component for a student ────
export async function POST(req) {
    try {
        const body = await req.json();
        const { action, studentId, particularId, schoolId, academicYearId, userId, overrideAmount } = body;

        if (action !== "activate-optional") {
            return NextResponse.json({ error: "Invalid action. Use 'activate-optional'" }, { status: 400 });
        }

        if (!studentId || !particularId || !schoolId || !academicYearId) {
            return NextResponse.json({ error: "Missing required fields: studentId, particularId, schoolId, academicYearId" }, { status: 400 });
        }

        // 1. Look up the GlobalFeeParticular and confirm it's optional
        const particular = await prisma.globalFeeParticular.findUnique({
            where: { id: particularId },
            include: { globalFeeStructure: { select: { id: true, schoolId: true } } },
        });

        if (!particular) {
            return NextResponse.json({ error: "Fee particular not found" }, { status: 404 });
        }
        if (!particular.isOptional) {
            return NextResponse.json({ error: "This fee component is not optional" }, { status: 400 });
        }

        // 2. Verify this particular belongs to the student's assigned fee structure
        const studentFee = await prisma.studentFee.findUnique({
            where: { studentId_academicYearId: { studentId, academicYearId } },
            select: { id: true, globalFeeStructureId: true, originalAmount: true, finalAmount: true, balanceAmount: true, discountAmount: true },
        });

        if (!studentFee) {
            return NextResponse.json({ error: "Student has no fee assigned for this academic year" }, { status: 400 });
        }
        if (studentFee.globalFeeStructureId !== particular.globalFeeStructure.id) {
            return NextResponse.json({ error: "This fee particular does not belong to the student's fee structure" }, { status: 400 });
        }

        // 3. Resolve feeSessionId
        const session = await prisma.feeSession.findFirst({
            where: { schoolId, academicYearId, isActive: true },
        });
        if (!session) {
            return NextResponse.json({ error: "No active fee session found for this academic year" }, { status: 404 });
        }
        const feeSessionId = session.id;

        // 4. Check if already activated — look for existing ledger entries for a matching component
        const existingComponent = await prisma.feeComponent.findFirst({
            where: {
                feeStructureId: studentFee.globalFeeStructureId,
                feeSessionId,
                name: particular.name,
                isOptional: true,
            },
        });

        if (existingComponent) {
            // Check if ledger entries already exist for this student+component
            const existingEntries = await prisma.studentFeeLedger.count({
                where: { studentId, feeComponentId: existingComponent.id },
            });
            if (existingEntries > 0) {
                return NextResponse.json({ error: "This optional fee is already activated for this student", alreadyActive: true }, { status: 409 });
            }
        }

        // 5. Create or find FeeComponent record
        let feeComponent = existingComponent;
        if (!feeComponent) {
            feeComponent = await prisma.feeComponent.create({
                data: {
                    feeStructureId: studentFee.globalFeeStructureId,
                    feeSessionId,
                    name: particular.name,
                    amount: overrideAmount || particular.amount,
                    type: particular.type || "MONTHLY",
                    category: particular.category || "FEE_TUITION",
                    chargeTiming: particular.chargeTiming || "CHARGE_MONTHLY",
                    serviceId: particular.serviceId || null,
                    isOptional: true,
                    isActive: true,
                    displayOrder: particular.displayOrder || 0,
                },
            });
        }

        // 6. Create StudentFeeParticular record
        try {
            await prisma.studentFeeParticular.create({
                data: {
                    studentFeeId: studentFee.id,
                    globalParticularId: particular.id,
                    name: particular.name,
                    amount: overrideAmount || particular.amount,
                    paidAmount: 0,
                },
            });
        } catch (dupErr) {
            // If it already exists, that's OK — could be a retry
            if (!dupErr.message?.includes('Unique constraint')) throw dupErr;
        }

        // 7. Generate ledger entries via addOptionalComponent
        let ledgerResult = { created: 0 };
        try {
            ledgerResult = await addOptionalComponent({
                studentId,
                schoolId,
                academicYearId,
                feeSessionId,
                feeComponentId: feeComponent.id,
                userId: userId || "SYSTEM",
            });
        } catch (ledgerErr) {
            console.error("Ledger generation failed:", ledgerErr.message);
        }

        // 8. Update StudentFee totals
        const feeAmount = overrideAmount || particular.amount;
        const monthlyTotal = feeAmount * (ledgerResult.created || 0);
        await prisma.studentFee.update({
            where: { id: studentFee.id },
            data: {
                originalAmount: { increment: monthlyTotal },
                finalAmount: { increment: monthlyTotal },
                balanceAmount: { increment: monthlyTotal },
            },
        });

        return NextResponse.json({
            success: true,
            feeComponentId: feeComponent.id,
            particularName: particular.name,
            monthlyAmount: feeAmount,
            ledgerEntriesCreated: ledgerResult.created,
            totalAdded: monthlyTotal,
        });
    } catch (error) {
        console.error("POST student-services Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}