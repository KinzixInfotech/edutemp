// ============================================
// API: /api/fee/discounts/route.js
// Apply discount to student
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            discountType,
            value,
            reason,
            approvedBy,
            remarks,
        } = body;

        if (!studentFeeId || !discountType || !value || !reason) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            const studentFee = await tx.studentFee.findUnique({
                where: { id: studentFeeId },
            });

            if (!studentFee) {
                throw new Error("Student fee record not found");
            }

            // Calculate discount amount
            let discountAmount = 0;
            if (discountType === "PERCENTAGE") {
                if (value < 0 || value > 100) {
                    throw new Error("Percentage must be between 0 and 100");
                }
                discountAmount = (studentFee.originalAmount * value) / 100;
            } else {
                discountAmount = value;
            }

            if (discountAmount > studentFee.originalAmount) {
                throw new Error("Discount cannot exceed original amount");
            }

            // Create discount record
            const discount = await tx.feeDiscount.create({
                data: {
                    studentFeeId,
                    reason,
                    discountType,
                    value,
                    amount: discountAmount,
                    approvedBy,
                    approvedDate: new Date(),
                    remarks,
                },
            });

            // Update StudentFee
            const newDiscountTotal = studentFee.discountAmount + discountAmount;
            const newFinalAmount = studentFee.originalAmount - newDiscountTotal;
            const newBalanceAmount = newFinalAmount - studentFee.paidAmount;

            await tx.studentFee.update({
                where: { id: studentFeeId },
                data: {
                    discountAmount: newDiscountTotal,
                    finalAmount: newFinalAmount,
                    balanceAmount: newBalanceAmount,
                },
            });

            return discount;
        });

        return NextResponse.json({
            message: "Discount applied successfully",
            discount: result,
        });
    } catch (error) {
        console.error("Apply Discount Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to apply discount" },
            { status: 400 }
        );
    }
}