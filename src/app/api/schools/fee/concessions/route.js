// ============================================
// API: /api/schools/fee/concessions/route.js
// Manage fee concessions and waivers
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Fetch concessions for a school
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId");
        const studentId = searchParams.get("studentId");

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        const where = {
            studentFee: {
                schoolId,
                ...(academicYearId && { academicYearId }),
                ...(studentId && { studentId }),
            },
        };

        const discounts = await prisma.feeDiscount.findMany({
            where,
            include: {
                studentFee: {
                    include: {
                        student: { select: { name: true, admissionNo: true } },
                        academicYear: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Group by type
        const summary = discounts.reduce((acc, d) => {
            acc[d.discountType] = (acc[d.discountType] || 0) + d.amount;
            return acc;
        }, {});

        return NextResponse.json({
            discounts,
            summary,
            total: discounts.reduce((sum, d) => sum + d.amount, 0),
        });

    } catch (error) {
        console.error("Fetch Concessions Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch concessions" },
            { status: 500 }
        );
    }
}

// POST - Apply a concession/waiver
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            discountType, // SIBLING, MERIT, STAFF_WARD, SCHOLARSHIP, CATEGORY, FULL_WAIVER, CUSTOM
            discountMode, // PERCENTAGE or FIXED
            value, // Percentage or fixed amount
            reason,
            approvedBy,
            categoryName, // For CATEGORY type (SC/ST/OBC etc)
        } = body;

        // Validation
        if (!studentFeeId || !discountType || !value) {
            return NextResponse.json(
                { error: "Missing required fields: studentFeeId, discountType, value" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Get student fee
            const studentFee = await tx.studentFee.findUnique({
                where: { id: studentFeeId },
                include: {
                    student: { select: { name: true, admissionNo: true } },
                    discounts: true,
                },
            });

            if (!studentFee) {
                throw new Error("Student fee record not found");
            }

            // Calculate discount amount
            let discountAmount = 0;
            if (discountType === "FULL_WAIVER") {
                discountAmount = studentFee.balanceAmount;
            } else if (discountMode === "PERCENTAGE") {
                discountAmount = Math.round((studentFee.originalAmount * value) / 100);
            } else {
                discountAmount = value;
            }

            // Ensure discount doesn't exceed balance
            if (discountAmount > studentFee.balanceAmount) {
                discountAmount = studentFee.balanceAmount;
            }

            if (discountAmount <= 0) {
                throw new Error("Invalid discount amount");
            }

            // Create discount record
            const discount = await tx.feeDiscount.create({
                data: {
                    studentFeeId,
                    discountType,
                    percentage: discountMode === "PERCENTAGE" ? value : null,
                    amount: discountAmount,
                    reason: reason || `${discountType} discount${categoryName ? ` (${categoryName})` : ''}`,
                    approvedBy,
                    appliedDate: new Date(),
                },
            });

            // Update student fee
            const newDiscountAmount = studentFee.discountAmount + discountAmount;
            const newFinalAmount = studentFee.originalAmount - newDiscountAmount;
            const newBalanceAmount = newFinalAmount - studentFee.paidAmount;
            const newStatus =
                newBalanceAmount <= 0 ? "PAID" : studentFee.paidAmount > 0 ? "PARTIAL" : "UNPAID";

            await tx.studentFee.update({
                where: { id: studentFeeId },
                data: {
                    discountAmount: newDiscountAmount,
                    finalAmount: newFinalAmount,
                    balanceAmount: Math.max(0, newBalanceAmount),
                    status: newStatus,
                },
            });

            return { discount, studentFee: { newFinalAmount, newBalanceAmount, newStatus } };
        });

        return NextResponse.json({
            success: true,
            message: "Concession applied successfully",
            discount: {
                id: result.discount.id,
                type: result.discount.discountType,
                amount: result.discount.amount,
            },
            updatedFee: result.studentFee,
        });

    } catch (error) {
        console.error("Apply Concession Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to apply concession" },
            { status: 400 }
        );
    }
}

// DELETE - Remove a concession
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const discountId = searchParams.get("discountId");

        if (!discountId) {
            return NextResponse.json(
                { error: "discountId is required" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Get discount
            const discount = await tx.feeDiscount.findUnique({
                where: { id: discountId },
                include: { studentFee: true },
            });

            if (!discount) {
                throw new Error("Discount not found");
            }

            // Reverse the discount
            const studentFee = discount.studentFee;
            const newDiscountAmount = studentFee.discountAmount - discount.amount;
            const newFinalAmount = studentFee.originalAmount - newDiscountAmount;
            const newBalanceAmount = newFinalAmount - studentFee.paidAmount;
            const newStatus =
                newBalanceAmount <= 0 ? "PAID" : studentFee.paidAmount > 0 ? "PARTIAL" : "UNPAID";

            await tx.studentFee.update({
                where: { id: studentFee.id },
                data: {
                    discountAmount: newDiscountAmount,
                    finalAmount: newFinalAmount,
                    balanceAmount: Math.max(0, newBalanceAmount),
                    status: newStatus,
                },
            });

            // Delete the discount
            await tx.feeDiscount.delete({
                where: { id: discountId },
            });

            return { removedDiscount: discount, updatedFee: { newFinalAmount, newBalanceAmount } };
        });

        return NextResponse.json({
            success: true,
            message: "Concession removed successfully",
            removedAmount: result.removedDiscount.amount,
            updatedFee: result.updatedFee,
        });

    } catch (error) {
        console.error("Remove Concession Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to remove concession" },
            { status: 400 }
        );
    }
}
