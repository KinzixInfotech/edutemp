// ============================================
// API: /api/fee/payments/route.js
// Process fee payments (Online & Offline)
// ENHANCED: Dual support for legacy Installments and new Financial Ledger
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { processPayment } from "@/lib/fee/payment-engine";

// Helper: Generate receipt number (Legacy)
function generateReceiptNumber(schoolId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REC-${schoolId.slice(0, 4).toUpperCase()}-${timestamp}-${random}`;
}

// Helper: Allocate payment to installments (Legacy)
async function allocatePaymentToInstallments(
    tx,
    studentFeeId,
    paymentId,
    amountToAllocate
) {
    // Get pending installments ordered by due date
    const installments = await tx.studentFeeInstallment.findMany({
        where: {
            studentFeeId,
            status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        },
        orderBy: [
            { isOverdue: "desc" }, // Pay overdue first
            { dueDate: "asc" },
        ],
    });

    let remainingAmount = amountToAllocate;
    const allocations = [];

    for (const installment of installments) {
        if (remainingAmount <= 0) break;

        const installmentBalance = installment.amount - installment.paidAmount;
        const amountForThis = Math.min(remainingAmount, installmentBalance);

        // Create allocation
        await tx.feePaymentInstallment.create({
            data: {
                paymentId,
                installmentId: installment.id,
                amount: amountForThis,
            },
        });

        // Update installment
        const newPaidAmount = installment.paidAmount + amountForThis;
        const newStatus =
            newPaidAmount >= installment.amount
                ? "PAID"
                : "PARTIAL";

        await tx.studentFeeInstallment.update({
            where: { id: installment.id },
            data: {
                paidAmount: newPaidAmount,
                status: newStatus,
                paidDate: newStatus === "PAID" ? new Date() : undefined,
            },
        });

        allocations.push({
            installmentId: installment.id,
            installmentNumber: installment.installmentNumber,
            amount: amountForThis,
        });

        remainingAmount -= amountForThis;
    }

    return { allocations, unallocatedAmount: remainingAmount };
}

// POST: Process Offline Payment (Cash, Cheque, etc.)
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            feeSessionId, // 🟢 New Ledger Indicator
            studentId,
            schoolId,
            academicYearId,
            amount,
            paymentMethod,
            referenceNumber,
            collectedBy,
            remarks,
        } = body;

        // V2: FINANCIAL LEDGER PROCESSING
        if (feeSessionId) {
            if (!studentId || !schoolId || !academicYearId || !amount) {
                return NextResponse.json({ error: "Missing required fields for ledger payment" }, { status: 400 });
            }

            const result = await processPayment({
                studentId,
                schoolId,
                academicYearId,
                feeSessionId,
                amountPaid: amount,
                paymentMode: "OFFLINE",
                paymentMethod: paymentMethod || "CASH",
                reference: referenceNumber,
                collectedBy,
                remarks
            });

            return NextResponse.json({
                message: "Ledger Payment processed successfully",
                paymentId: result.paymentId,
                receiptId: result.receiptId,
                receiptNumber: result.receiptNumber,
                allocationsCount: result.allocatedToItems,
                walletCredited: result.walletCredited,
                isLedgerEngine: true
            });
        }

        // V1: LEGACY INSTALLMENT PROCESSING
        // Validation
        if (!studentFeeId || !studentId || !schoolId || !academicYearId || !amount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: "Amount must be positive" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Verify student fee
            const studentFee = await tx.studentFee.findUnique({
                where: { id: studentFeeId },
            });

            if (!studentFee) {
                throw new Error("Student fee record not found");
            }

            if (amount > studentFee.balanceAmount) {
                throw new Error(
                    `Payment amount (₹${amount}) exceeds balance (₹${studentFee.balanceAmount})`
                );
            }

            // Generate receipt number
            const receiptNumber = generateReceiptNumber(schoolId);

            // Create payment record
            const payment = await tx.feePayment.create({
                data: {
                    studentFeeId,
                    studentId,
                    schoolId,
                    academicYearId,
                    amount,
                    paymentMode: "OFFLINE",
                    paymentMethod: paymentMethod || "CASH",
                    referenceNumber,
                    status: "SUCCESS",
                    receiptNumber,
                    collectedBy,
                    remarks,
                    paymentDate: new Date(),
                    clearedDate: new Date(),
                },
            });

            // Allocate payment to installments
            const { allocations } = await allocatePaymentToInstallments(
                tx,
                studentFeeId,
                payment.id,
                amount
            );

            // Update student fee
            const newPaidAmount = studentFee.paidAmount + amount;
            const newBalanceAmount = studentFee.finalAmount - newPaidAmount;
            const newStatus =
                newBalanceAmount <= 0
                    ? "PAID"
                    : newPaidAmount > 0
                        ? "PARTIAL"
                        : "UNPAID";

            await tx.studentFee.update({
                where: { id: studentFeeId },
                data: {
                    paidAmount: newPaidAmount,
                    balanceAmount: newBalanceAmount,
                    status: newStatus,
                    lastPaymentDate: new Date(),
                },
            });

            // For V1 fallback: generate a generic receipt record if possible,
            // but V1 already relied on just the feePayment record. We skip the new `Receipt` model for V1.

            return { payment, allocations };
        });

        return NextResponse.json({
            message: "Legacy Payment processed successfully",
            payment: result.payment,
            allocations: result.allocations,
            isLedgerEngine: false
        });
    } catch (error) {
        console.error("Process Payment Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process payment" },
            { status: 400 }
        );
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId");
        const studentId = searchParams.get("studentId");
        const search = searchParams.get("search") || "";
        const className = searchParams.get("className");
        const sectionName = searchParams.get("sectionName");
        const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);
        const skip = (page - 1) * limit;

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
        }

        // Build where clause carefully — Student fields use direct columns, not user relation
        const where = {
            schoolId,
            status: "SUCCESS",
            ...(academicYearId && { academicYearId }),
            ...(studentId && { studentId }),
        };

        // Search filters go on the student relation
        if (search || className || sectionName) {
            where.student = {
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { admissionNo: { contains: search, mode: "insensitive" } },
                    ],
                }),
                ...(className && { class: { className } }),
                ...(sectionName && { section: { name: sectionName } }),
            };
        }

        // Single query with all includes — no N+1
        const [payments, totalCount] = await Promise.all([
            prisma.feePayment.findMany({
                where,
                include: {
                    student: {
                        select: {
                            name: true,
                            admissionNo: true,
                            admissionDate: true,
                            FatherName: true,
                            MotherName: true,
                            GuardianName: true,
                            GuardianRelation: true,
                            user: {
                                select: {
                                    profilePicture: true,
                                },
                            },
                            class: {
                                select: {
                                    className: true,
                                },
                            },
                            section: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    studentFee: {
                        select: {
                            finalAmount: true,
                            paidAmount: true,
                            balanceAmount: true,
                        },
                    },
                    // FeePayment → installmentPayments (FeePaymentInstallment[])
                    // Each FeePaymentInstallment has installment → StudentFeeInstallment
                    installmentPayments: {
                        select: {
                            amount: true,
                            installment: {
                                select: {
                                    id: true,
                                    installmentNumber: true,
                                    dueDate: true,
                                    amount: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    paymentDate: "desc",
                },
                skip,
                take: limit,
            }),
            prisma.feePayment.count({ where }),
        ]);

        return NextResponse.json({
            items: payments.map((payment) => ({
                id: payment.id,
                amount: Number(payment.amount || 0),
                paymentDate: payment.paymentDate,
                paymentMethod: payment.paymentMethod,
                paymentMode: payment.paymentMode,
                receiptNumber: payment.receiptNumber,
                receiptUrl: payment.receiptUrl || null,
                referenceNumber: payment.referenceNumber || null,
                remarks: payment.remarks || null,
                status: payment.status,
                studentId: payment.studentId,
                // Student fields — from Student model directly (not User)
                studentName: payment.student?.name || "Unknown Student",
                admissionNo: payment.student?.admissionNo || "",
                className: payment.student?.class?.className || "",
                sectionName: payment.student?.section?.name || "",
                profilePicture: payment.student?.user?.profilePicture || null,
                // Student model has admissionDate as String, not DateTime
                admissionDate: payment.student?.admissionDate || null,
                fatherName: payment.student?.FatherName || "",
                motherName: payment.student?.MotherName || "",
                guardianName: payment.student?.GuardianName || "",
                guardianRelation: payment.student?.GuardianRelation || "",
                studentFee: payment.studentFee
                    ? {
                        finalAmount: Number(payment.studentFee.finalAmount || 0),
                        paidAmount: Number(payment.studentFee.paidAmount || 0),
                        balanceAmount: Number(payment.studentFee.balanceAmount || 0),
                    }
                    : null,
                // installmentPayments is the correct relation name on FeePayment
                installmentSummary: (payment.installmentPayments || []).map((pi) => ({
                    id: pi.installment?.id || null,
                    installmentNumber: pi.installment?.installmentNumber || null,
                    monthLabel: pi.installment?.dueDate
                        ? new Date(pi.installment.dueDate).toLocaleDateString("en-IN", {
                            month: "long",
                            year: "numeric",
                        })
                        : null,
                    dueDate: pi.installment?.dueDate || null,
                    installmentAmount: Number(pi.installment?.amount || 0),
                    allocatedAmount: Number(pi.amount || 0),
                })),
            })),
            pagination: {
                page,
                limit,
                total: totalCount,
                hasMore: skip + payments.length < totalCount,
                nextPage: skip + payments.length < totalCount ? page + 1 : null,
            },
        });
    } catch (error) {
        console.error("Fetch Payments Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch payments" },
            { status: 500 }
        );
    }
}