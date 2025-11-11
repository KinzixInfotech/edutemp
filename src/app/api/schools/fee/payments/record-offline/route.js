// ============================================
// API: /api/schools/fee/payments/record-offline/route.js
// ============================================
// ============================================
// API: /api/schools/fee/payments/record-offline/route.js
// FINAL 100% PERFECT VERSION
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateReceiptPdf } from "@/lib/generateReceiptPdf";
import { utapi } from "@/app/api/lib";

// Remove this line — not needed:
// import { ourFileRouter } from "@/app/api/uploadthing/core";

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            studentId,
            schoolId,
            academicYearId,
            amount,
            installmentIds,
            paymentMethod = "ONLINE",
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
            const studentFee = await tx.studentFee.findUnique({
                where: { id: studentFeeId },
                include: {
                    student: {
                        include: { class: { select: { className: true } } }
                    },
                    school: true,
                    academicYear: true,
                    installments: {
                        where: installmentIds && installmentIds.length > 0
                            ? { id: { in: installmentIds } }
                            : { status: { in: ["PENDING", "PARTIAL"] } },
                        orderBy: { installmentNumber: "asc" },
                    },
                    particulars: true,
                },
            });

            if (!studentFee) throw new Error("Student fee record not found");

            let paymentAmount = parseFloat(Number(amount).toFixed(2));
            if (isNaN(paymentAmount)) throw new Error("Invalid amount");

            // Convert both to paisa (multiply by 100) → avoids floating point hell
            const amountInPaisa = Math.round(paymentAmount * 100);
            const balanceInPaisa = Math.round(Number(studentFee.balanceAmount) * 100);

            console.log("Amount (paisa):", amountInPaisa);
            console.log("Balance (paisa):", balanceInPaisa);

            if (amountInPaisa > balanceInPaisa) {
                const balanceInRupees = (balanceInPaisa / 100).toFixed(2);
                throw new Error(`Amount exceeds balance. Balance: ₹${balanceInRupees}`);
            }

            const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
                    remarks: remarks || "Offline payment",
                    paymentDate: new Date(),
                    clearedDate: new Date(),
                },
            });

            // Allocation logic (unchanged — perfect)
            let remainingAmount = paymentAmount;
            const allocations = [];
            const particularUpdates = {};

            for (const installment of studentFee.installments) {
                if (remainingAmount <= 0) break;

                const installmentBalance = installment.amount - installment.paidAmount;
                const amountToAllocate = Math.min(remainingAmount, installmentBalance);

                await tx.feePaymentInstallment.create({
                    data: {
                        paymentId: payment.id,
                        installmentId: installment.id,
                        amount: amountToAllocate,
                    },
                });

                const newPaidAmount = installment.paidAmount + amountToAllocate;
                const newStatus = newPaidAmount >= installment.amount ? "PAID" :
                    newPaidAmount > 0 ? "PARTIAL" : "PENDING";

                await tx.studentFeeInstallment.update({
                    where: { id: installment.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus,
                        ...(newStatus === "PAID" && { paidDate: new Date() }),
                    },
                });

                const sharePerInstallment = amountToAllocate / installment.amount;
                for (const particular of studentFee.particulars) {
                    const share = (particular.amount / studentFee.originalAmount) * amountToAllocate;
                    particularUpdates[particular.id] = (particularUpdates[particular.id] || 0) + share;
                }

                allocations.push({
                    installmentNumber: installment.installmentNumber,
                    amount: amountToAllocate,
                    status: newStatus,
                });

                remainingAmount -= amountToAllocate;
            }

            // Update particulars
            for (const [id, paid] of Object.entries(particularUpdates)) {
                const particular = await tx.studentFeeParticular.findUnique({ where: { id } });
                const newPaid = particular.paidAmount + paid;
                const newStatus = newPaid >= particular.amount ? "PAID" :
                    newPaid > 0 ? "PARTIAL" : "UNPAID";

                await tx.studentFeeParticular.update({
                    where: { id },
                    data: { paidAmount: newPaid, status: newStatus },
                });
            }

            // Update studentFee
            const newPaidTotal = studentFee.paidAmount + paymentAmount;
            const newBalance = studentFee.finalAmount - newPaidTotal;
            const feeStatus = newBalance <= 0 ? "PAID" : newPaidTotal > 0 ? "PARTIAL" : "UNPAID";

            await tx.studentFee.update({
                where: { id: studentFeeId },
                data: {
                    paidAmount: newPaidTotal,
                    balanceAmount: newBalance,
                    status: feeStatus,
                    lastPaymentDate: new Date(),
                },
            });

            return { payment, allocations, newBalance, studentFee };
        });

        // PDF Generation & Upload (outside transaction)
        const { payment, allocations, studentFee } = result;

        const pdfBuffer = await generateReceiptPdf({
            school: {
                name: studentFee.school.name,
                address: studentFee.school.address || "School Address",
                logo: studentFee.school.logoUrl,
            },
            receiptNumber: payment.receiptNumber,
            studentName: studentFee.student.name,
            admissionNo: studentFee.student.admissionNo,
            className: studentFee.student.class.className,
            paymentDate: payment.paymentDate,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            academicYear: studentFee.academicYear.name,
            installments: allocations.map(a => ({
                number: a.installmentNumber,
                amount: a.amount,
            })),
        });
        // Create proper File object
        const pdfFile = new File([pdfBuffer], `${payment.receiptNumber}.pdf`, {
            type: "application/pdf",
        });
        // OFFICIAL SERVER-SIDE UPLOAD (2025)
        const uploadResponse = await utapi.uploadFiles(pdfFile, {
            metadata: {
                paymentId: payment.id,
                schoolId: schoolId,
            },
        });
        const resultPdf = uploadResponse; // It's a single object now, not array
        if (resultPdf.error) {
            console.error("Upload failed:", resultPdf.error);
            throw new Error("PDF upload failed: " + resultPdf.error.message);
        }
        const uploadedUrl = resultPdf.data.url;
        console.log("PDF Uploaded Successfully:", uploadedUrl);

        console.log("PDF Uploaded:", uploadedUrl);

        await prisma.feePayment.update({
            where: { id: payment.id },
            data: { receiptUrl: uploadedUrl },
        });

        return NextResponse.json({
            success: true,
            message: "Payment recorded and receipt generated!",
            payment: {
                id: payment.id,
                receiptNumber: payment.receiptNumber,
                amount: payment.amount,
                paymentDate: payment.paymentDate,
                receiptUrl: uploadedUrl,
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
            { status: 500 }
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