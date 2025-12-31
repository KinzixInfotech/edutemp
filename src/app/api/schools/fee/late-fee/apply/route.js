// ============================================
// API: /api/schools/fee/late-fee/apply/route.js
// Auto-apply late fees to overdue installments
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, dryRun = false } = body;

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        // Fetch fee settings
        const feeSettings = await prisma.feeSettings.findUnique({
            where: { schoolId },
        });

        if (!feeSettings?.lateFeeEnabled) {
            return NextResponse.json({
                message: "Late fee is not enabled for this school",
                applied: 0,
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate grace period date
        const gracePeriodDate = new Date(today);
        gracePeriodDate.setDate(gracePeriodDate.getDate() - feeSettings.gracePeriodDays);

        // Find overdue installments that haven't been charged late fee yet
        const overdueInstallments = await prisma.studentFeeInstallment.findMany({
            where: {
                studentFee: { schoolId },
                status: { in: ["PENDING", "PARTIAL"] },
                dueDate: { lt: gracePeriodDate },
                lateFee: 0, // Not yet charged
            },
            include: {
                studentFee: {
                    include: {
                        student: { select: { name: true, admissionNo: true } },
                    },
                },
            },
        });

        if (overdueInstallments.length === 0) {
            return NextResponse.json({
                message: "No eligible installments for late fee",
                applied: 0,
            });
        }

        const results = [];

        for (const installment of overdueInstallments) {
            // Calculate late fee amount
            let lateFeeAmount = 0;
            const balanceDue = installment.amount - installment.paidAmount;

            if (feeSettings.lateFeeType === "FIXED") {
                lateFeeAmount = feeSettings.lateFeeAmount;
            } else if (feeSettings.lateFeeType === "PERCENTAGE") {
                lateFeeAmount = Math.round((balanceDue * feeSettings.lateFeePercentage) / 100);
            }

            if (lateFeeAmount <= 0) continue;

            if (!dryRun) {
                // Update installment with late fee
                await prisma.studentFeeInstallment.update({
                    where: { id: installment.id },
                    data: {
                        lateFee: lateFeeAmount,
                        isOverdue: true,
                        status: "OVERDUE",
                    },
                });

                // Update student fee balance
                await prisma.studentFee.update({
                    where: { id: installment.studentFeeId },
                    data: {
                        finalAmount: { increment: lateFeeAmount },
                        balanceAmount: { increment: lateFeeAmount },
                    },
                });
            }

            results.push({
                installmentId: installment.id,
                studentName: installment.studentFee.student.name,
                admissionNo: installment.studentFee.student.admissionNo,
                installmentNumber: installment.installmentNumber,
                dueDate: installment.dueDate,
                balanceDue,
                lateFeeApplied: lateFeeAmount,
            });
        }

        return NextResponse.json({
            success: true,
            message: dryRun ? "Dry run complete - no changes made" : "Late fees applied successfully",
            applied: results.length,
            dryRun,
            details: results,
            settings: {
                lateFeeType: feeSettings.lateFeeType,
                lateFeeAmount: feeSettings.lateFeeAmount,
                lateFeePercentage: feeSettings.lateFeePercentage,
                gracePeriodDays: feeSettings.gracePeriodDays,
            },
        });

    } catch (error) {
        console.error("Apply Late Fee Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to apply late fees" },
            { status: 500 }
        );
    }
}
