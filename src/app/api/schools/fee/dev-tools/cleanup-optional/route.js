// ═══════════════════════════════════════════════════════════════
// ONE-TIME CLEANUP: Remove optional particulars from already-assigned students
// Run via: POST /api/schools/fee/dev-tools/cleanup-optional
// Body: { "schoolId": "your-school-id", "dryRun": true }
// Set dryRun: false to actually apply changes
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
    try {
        const { schoolId, dryRun = true } = await req.json();

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId required" }, { status: 400 });
        }

        // 1. Find all optional GlobalFeeParticulars for this school
        const optionalParticulars = await prisma.globalFeeParticular.findMany({
            where: {
                isOptional: true,
                globalFeeStructure: { schoolId },
            },
            select: { id: true, name: true, amount: true },
        });

        if (optionalParticulars.length === 0) {
            return NextResponse.json({
                message: "No optional particulars found in any fee structure",
                affected: 0,
            });
        }

        const optionalIds = optionalParticulars.map(p => p.id);

        // 2. Find all StudentFeeParticulars linked to these optional particulars
        const studentParticulars = await prisma.studentFeeParticular.findMany({
            where: {
                globalParticularId: { in: optionalIds },
            },
            include: {
                studentFee: {
                    select: {
                        id: true,
                        studentId: true,
                        originalAmount: true,
                        finalAmount: true,
                        balanceAmount: true,
                        discountAmount: true,
                    },
                },
            },
        });

        if (studentParticulars.length === 0) {
            return NextResponse.json({
                message: "No students have optional particulars assigned — all clean!",
                affected: 0,
                optionalParticulars: optionalParticulars.map(p => p.name),
            });
        }

        // 3. Group by studentFeeId to calculate adjustments
        const adjustments = {};
        for (const sp of studentParticulars) {
            const sfId = sp.studentFeeId;
            if (!adjustments[sfId]) {
                adjustments[sfId] = {
                    studentFeeId: sfId,
                    studentId: sp.studentFee.studentId,
                    currentOriginal: sp.studentFee.originalAmount,
                    currentFinal: sp.studentFee.finalAmount,
                    currentBalance: sp.studentFee.balanceAmount,
                    discount: sp.studentFee.discountAmount,
                    amountToRemove: 0,
                    particularsToRemove: [],
                };
            }
            // Only remove the amount if the particular hasn't been paid
            adjustments[sfId].amountToRemove += sp.amount;
            adjustments[sfId].particularsToRemove.push({
                id: sp.id,
                name: sp.name,
                amount: sp.amount,
                paidAmount: sp.paidAmount,
            });
        }

        // Check if any optional particulars have payments
        const withPayments = Object.values(adjustments).flatMap(a =>
            a.particularsToRemove.filter(p => p.paidAmount > 0)
        );

        if (withPayments.length > 0 && !dryRun) {
            return NextResponse.json({
                error: "Some optional particulars have payments. Cannot auto-cleanup.",
                withPayments,
                message: "These need manual handling — contact support or handle individually.",
            }, { status: 400 });
        }

        const summary = Object.values(adjustments).map(a => ({
            studentId: a.studentId,
            removing: a.particularsToRemove.map(p => `${p.name} (₹${p.amount})`),
            amountReduced: a.amountToRemove,
            newOriginal: a.currentOriginal - a.amountToRemove,
            newFinal: a.currentFinal - a.amountToRemove,
            newBalance: a.currentBalance - a.amountToRemove,
        }));

        if (dryRun) {
            return NextResponse.json({
                dryRun: true,
                message: `Would clean up ${studentParticulars.length} optional particular(s) from ${Object.keys(adjustments).length} student(s)`,
                optionalParticulars: optionalParticulars.map(p => `${p.name} (₹${p.amount})`),
                affectedStudents: summary,
                instruction: "Set dryRun: false to apply these changes",
            });
        }

        // 4. Apply cleanup in a transaction
        await prisma.$transaction(async (tx) => {
            // Remove the optional StudentFeeParticulars
            await tx.studentFeeParticular.deleteMany({
                where: {
                    globalParticularId: { in: optionalIds },
                    paidAmount: 0, // safety: only remove unpaid
                },
            });

            // Also remove related ledger entries that are unfrozen
            // (from the ledger engine which might have generated them)
            const optionalComponents = await tx.feeComponent.findMany({
                where: { isOptional: true, feeStructure: { schoolId } },
                select: { id: true },
            });
            const optComponentIds = optionalComponents.map(c => c.id);

            if (optComponentIds.length > 0) {
                await tx.studentFeeLedger.deleteMany({
                    where: {
                        feeComponentId: { in: optComponentIds },
                        isFrozen: false,
                        paidAmount: 0,
                    },
                });
            }

            // Adjust StudentFee totals
            for (const adj of Object.values(adjustments)) {
                const newOriginal = adj.currentOriginal - adj.amountToRemove;
                const newFinal = newOriginal - adj.discount;
                const newBalance = Math.max(0, adj.currentBalance - adj.amountToRemove);

                await tx.studentFee.update({
                    where: { id: adj.studentFeeId },
                    data: {
                        originalAmount: newOriginal,
                        finalAmount: newFinal,
                        balanceAmount: newBalance,
                    },
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: `Cleaned up ${studentParticulars.length} optional particular(s) from ${Object.keys(adjustments).length} student(s)`,
            affectedStudents: summary,
        });

    } catch (error) {
        console.error("Cleanup Optional Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
