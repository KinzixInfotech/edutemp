import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateStudentLedger, regenerateStudentLedger } from "@/lib/fee/ledger-engine";
import { calculateLateFees } from "@/lib/fee/late-fee-engine";
import { applyDiscount, waiveBalance } from "@/lib/fee/discount-engine";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const feeSessionId = searchParams.get("feeSessionId");
        const forceRecalculate = searchParams.get("forceRecalculate") === "true";

        if (!studentId || !feeSessionId) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        // 1. Calculate and cache any pending late fees first
        await calculateLateFees(studentId, feeSessionId, forceRecalculate);

        // 2. Fetch the fully updated ledger
        const ledger = await prisma.studentFeeLedger.findMany({
            where: { studentId, feeSessionId },
            include: {
                feeComponent: {
                    select: { name: true, type: true, category: true, isOptional: true }
                }
            },
            orderBy: [
                { month: "asc" },
                { dueDate: "asc" },
                { feeComponent: { displayOrder: "asc" } }
            ]
        });

        // 3. Calculate summary totals
        const summary = ledger.reduce((acc, entry) => {
            acc.totalOriginal += entry.originalAmount;
            acc.totalDiscount += entry.discountAmount;
            acc.totalLateFee += entry.lateFeeAmount;
            acc.totalNet += entry.netAmount;
            acc.totalPaid += entry.paidAmount;
            acc.totalBalance += entry.balanceAmount;
            return acc;
        }, {
            totalOriginal: 0,
            totalDiscount: 0,
            totalLateFee: 0,
            totalNet: 0,
            totalPaid: 0,
            totalBalance: 0
        });

        return NextResponse.json({ success: true, ledger, summary });

    } catch (error) {
        console.error("Ledger GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { action, studentId, schoolId, academicYearId, feeSessionId, feeStructureId, joinDate, userId } = body;

        // Note: For production use true authentication user extraction. 
        // Using provided userId for now (defaulting to system if missing).
        const actorId = userId || "SYSTEM";

        if (action === "generate") {
            const result = await generateStudentLedger({
                studentId, schoolId, academicYearId, feeSessionId,
                feeStructureId, joinDate: joinDate || new Date(), userId: actorId
            });
            return NextResponse.json({ success: true, ...result });
        }

        if (action === "regenerate") {
            const result = await regenerateStudentLedger({
                studentId, feeSessionId, feeStructureId, userId: actorId
            });
            return NextResponse.json({ success: true, ...result });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Ledger POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const { action, ledgerEntryId, discountAmount, reason, userId } = body;
        const actorId = userId || "SYSTEM";

        if (!ledgerEntryId) {
            return NextResponse.json({ error: "Missing ledgerEntryId" }, { status: 400 });
        }

        if (action === "discount") {
            if (discountAmount === undefined) return NextResponse.json({ error: "Missing discountAmount" }, { status: 400 });
            const result = await applyDiscount(ledgerEntryId, discountAmount, actorId, reason);
            return NextResponse.json({ success: true, updatedEntry: result });
        }

        if (action === "waive") {
            const result = await waiveBalance(ledgerEntryId, actorId, reason);
            return NextResponse.json({ success: true, updatedEntry: result });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Ledger PATCH Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
