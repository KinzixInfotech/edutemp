// ============================================
// API: /api/schools/fee/payments/record-offline/route.js
// Simple offline payment recording (for testing)
// ============================================
import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma"; 

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            studentId,
            schoolId,
            academicYearId,
            amount,
            installmentIds, // Array of installment IDs to pay
            paymentMethod = "CASH", // CASH, UPI, CARD, etc.
            remarks,
        } = body;

        console.log("Payment Request:", body);

        // Validation
        if (!studentFeeId || !studentId || !amount || !schoolId || !academicYearId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: "Amount must be greater than 0" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Get student fee
            const studentFee = await tx.studentFee.findUnique({
                where: { id: studentFeeId },
                include: {
                    installments: {
                        where: installmentIds && installmentIds.length > 0
                            ? { id: { in: installmentIds } }
                            : { status: { in: ["PENDING", "PARTIAL"] } },
                        orderBy: { installmentNumber: "asc" },
                    },
                    particulars: true,
                },
            });

            if (!studentFee) {
                throw new Error("Student fee record not found");
            }

            // FIX: Use a different variable name to avoid shadowing
            let paymentAmount = Number(amount);
            if (isNaN(paymentAmount)) {
                throw new Error("Invalid amount");
            }
            paymentAmount = parseFloat(paymentAmount.toFixed(2));

            const balance = Number(studentFee.balanceAmount).toFixed(2);
            console.log(paymentAmount, balance);

            if (paymentAmount > Number(balance)) {
                throw new Error(`Amount exceeds balance. Balance: ₹${balance}`);
            }

            // Generate receipt number
            const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Create payment record
            const payment = await tx.feePayment.create({
                data: {
                    studentFeeId,
                    studentId,
                    schoolId,
                    academicYearId,
                    amount: paymentAmount,
                    paymentMode: "OFFLINE",
                    paymentMethod,
                    status: "SUCCESS",
                    receiptNumber,
                    remarks: remarks || "Offline payment - Testing",
                    paymentDate: new Date(),
                    clearedDate: new Date(),
                },
            });

            console.log("Payment created:", payment.id);

            // Allocate payment to installments
            let remainingAmount = paymentAmount;
            const allocations = [];
            const particularUpdates = {};

            for (const installment of studentFee.installments) {
                if (remainingAmount <= 0) break;

                const installmentBalance = installment.amount - installment.paidAmount;
                const amountToAllocate = Math.min(remainingAmount, installmentBalance);

                console.log(`Allocating ₹${amountToAllocate} to Installment ${installment.installmentNumber}`);

                // Link payment to installment
                await tx.feePaymentInstallment.create({
                    data: {
                        paymentId: payment.id,
                        installmentId: installment.id,
                        amount: amountToAllocate,
                    },
                });

                // Update installment
                const newPaidAmount = installment.paidAmount + amountToAllocate;
                const newStatus =
                    newPaidAmount >= installment.amount
                        ? "PAID"
                        : newPaidAmount > 0
                            ? "PARTIAL"
                            : "PENDING";

                await tx.studentFeeInstallment.update({
                    where: { id: installment.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                        ...(newStatus === "PAID" && { paidDate: new Date() }),
                    },
                });

                // Proportional distribution to particulars
                const installmentTotal = installment.amount;
                const paymentPercentage = amountToAllocate / installmentTotal;

                for (const particular of studentFee.particulars) {
                    const particularShare = (particular.amount / studentFee.originalAmount) * amountToAllocate;

                    if (!particularUpdates[particular.id]) {
                        particularUpdates[particular.id] = 0;
                    }
                    particularUpdates[particular.id] += particularShare;
                }

                allocations.push({
                    installmentNumber: installment.installmentNumber,
                    amount: amountToAllocate,
                    status: newStatus,
                });

                remainingAmount -= amountToAllocate;
            }

            console.log("Allocations:", allocations);

            // Update StudentFeeParticular totals
            for (const [particularId, paidAmount] of Object.entries(particularUpdates)) {
                const particular = await tx.studentFeeParticular.findUnique({
                    where: { id: particularId },
                });

                const newPaidAmount = particular.paidAmount + paidAmount;
                const newStatus =
                    newPaidAmount >= particular.amount
                        ? "PAID"
                        : newPaidAmount > 0
                            ? "PARTIAL"
                            : "UNPAID";

                await tx.studentFeeParticular.update({
                    where: { id: particularId },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                    },
                });
            }

            // Update StudentFee totals
            const newPaidAmountTotal = studentFee.paidAmount + paymentAmount;
            const newBalanceAmount = studentFee.finalAmount - newPaidAmountTotal;
            const newStatus =
                newBalanceAmount <= 0
                    ? "PAID"
                    : newPaidAmountTotal > 0
                        ? "PARTIAL"
                        : "UNPAID";

            await tx.studentFee.update({
                where: { id: studentFeeId },
                data: {
                    paidAmount: newPaidAmountTotal,
                    balanceAmount: newBalanceAmount,
                    status: newStatus,
                    lastPaymentDate: new Date(),
                },
            });

            return {
                payment,
                allocations,
                particularUpdates,
                newBalance: newBalanceAmount,
            };
        });

        return NextResponse.json({
            success: true,
            message: "Payment recorded successfully",
            payment: {
                id: result.payment.id,
                receiptNumber: result.payment.receiptNumber,
                amount: result.payment.amount,
                paymentDate: result.payment.paymentDate,
            },
            allocations: result.allocations,
            newBalance: result.newBalance,
        });
    } catch (error) {
        console.error("Payment Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to record payment",
            },
            { status: 400 }
        );
    }
}
// ============================================
// GET: Fetch payment receipt
// ============================================
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const receiptNumber = searchParams.get("receiptNumber");

        if (!receiptNumber) {
            return NextResponse.json(
                { error: "receiptNumber required" },
                { status: 400 }
            );
        }

        const payment = await prisma.feePayment.findUnique({
            where: { receiptNumber },
            include: {
                student: {
                    select: {
                        name: true,
                        admissionNo: true,
                        class: { select: { className: true } },
                    },
                },
                installmentPayments: {
                    include: {
                        installment: {
                            select: {
                                installmentNumber: true,
                                amount: true,
                            },
                        },
                    },
                },
            },
        });

        if (!payment) {
            return NextResponse.json(
                { error: "Payment not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(payment);
    } catch (error) {
        console.error("Get Payment Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch payment" },
            { status: 500 }
        );
    }
}