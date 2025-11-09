// ============================================
// FILE STRUCTURE - Where to Add Everything
// ============================================

/*
your-project/
├── prisma/
│   └── schema.prisma                          ← ADD NEW MODELS HERE
│
├── app/
│   └── api/
│       └── schools/
│           └── fee/
│               ├── assign/
│               │   └── route.js               ← UPDATE: Enhanced fee assignment
│               │
│               ├── students/
│               │   └── [studentId]/
│               │       └── route.js           ← UPDATE: Enhanced student fee details
│               │
│               ├── parent/
│               │   └── my-fees/
│               │       └── route.js           ← UPDATE: Enhanced parent view
│               │
│               ├── payments/
│               │   ├── record/
│               │   │   └── route.js           ← ADD NEW: Record payment with allocation
│               │   │
│               │   └── online/
│               │       ├── initiate/
│               │       │   └── route.js       ← Already exists
│               │       └── verify/
│               │           └── route.js       ← Already exists
│               │
│               └── admin/
│                   ├── dashboard/
│                   │   └── route.js           ← Already exists
│                   └── reports/
│                       └── route.js           ← Already exists
│
├── lib/
│   └── payment-allocation.js                  ← ADD NEW: Shared allocation logic
│
└── scripts/
    └── migrate-installment-particulars.js     ← ADD NEW: One-time migration
*/

// ============================================
// 1. SCHEMA.PRISMA - Add New Model
// Location: prisma/schema.prisma
// ============================================

/*
// ADD THIS NEW MODEL after StudentFeeParticular:

model InstallmentParticular {
  id            String   @id @default(uuid()) @db.Uuid
  installmentId String   @db.Uuid
  particularId  String   @db.Uuid
  amount        Float
  paidAmount    Float    @default(0)
  
  installment StudentFeeInstallment @relation(fields: [installmentId], references: [id], onDelete: Cascade)
  particular  StudentFeeParticular  @relation(fields: [particularId], references: [id], onDelete: Cascade)
  
  @@unique([installmentId, particularId])
  @@index([installmentId])
  @@index([particularId])
}

// UPDATE StudentFeeInstallment - add this line:
model StudentFeeInstallment {
  // ... existing fields ...
  particularBreakdowns InstallmentParticular[]  // ← ADD THIS
}

// UPDATE StudentFeeParticular - add this line:
model StudentFeeParticular {
  // ... existing fields ...
  installmentBreakdowns InstallmentParticular[]  // ← ADD THIS
}
*/

// ============================================
// 2. SHARED PAYMENT ALLOCATION LOGIC
// Location: lib/payment-allocation.js (NEW FILE)
// ============================================

// CREATE THIS FILE:
export async function allocatePaymentToInstallments(tx, studentFeeId, paymentId, amount) {
    // Get all unpaid/partial installments
    const installments = await tx.studentFeeInstallment.findMany({
        where: {
            studentFeeId,
            status: { in: ["PENDING", "PARTIAL"] },
        },
        include: {
            particularBreakdowns: {
                include: {
                    particular: true
                }
            }
        },
        orderBy: { installmentNumber: "asc" },
    });

    let remainingAmount = amount;
    const allocations = [];
    const particularUpdates = {};

    for (const installment of installments) {
        if (remainingAmount <= 0) break;

        const installmentBalance = installment.amount - installment.paidAmount;
        const amountToAllocate = Math.min(remainingAmount, installmentBalance);

        // Create payment-installment link
        await tx.feePaymentInstallment.create({
            data: {
                paymentId,
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

        // Allocate proportionally to particulars
        const installmentTotal = installment.amount;

        for (const breakdown of installment.particularBreakdowns) {
            const particularShare = (breakdown.amount / installmentTotal) * amountToAllocate;

            await tx.installmentParticular.update({
                where: { id: breakdown.id },
                data: {
                    paidAmount: breakdown.paidAmount + particularShare
                }
            });

            if (!particularUpdates[breakdown.particularId]) {
                particularUpdates[breakdown.particularId] = 0;
            }
            particularUpdates[breakdown.particularId] += particularShare;
        }

        allocations.push({
            installmentNumber: installment.installmentNumber,
            amount: amountToAllocate,
            status: newStatus,
        });

        remainingAmount -= amountToAllocate;
    }

    // Update StudentFeeParticular totals
    for (const [particularId, paidAmount] of Object.entries(particularUpdates)) {
        const particular = await tx.studentFeeParticular.findUnique({
            where: { id: particularId }
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
                status: newStatus
            }
        });
    }

    return { allocations, particularUpdates };
}

// ============================================
// 3. RECORD PAYMENT API
// Location: app/api/schools/fee/payments/record/route.js (NEW FILE)
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { allocatePaymentToInstallments } from "@/lib/payment-allocation";

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            studentId,
            schoolId,
            academicYearId,
            amount,
            paymentMode,
            paymentMethod,
            transactionId,
            collectedBy,
            remarks,
        } = body;

        if (!studentFeeId || !studentId || !amount) {
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

            if (amount > studentFee.balanceAmount) {
                throw new Error("Amount exceeds balance");
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
                    amount,
                    paymentMode: paymentMode || "OFFLINE",
                    paymentMethod: paymentMethod || "CASH",
                    status: "SUCCESS",
                    receiptNumber,
                    transactionId,
                    collectedBy,
                    remarks,
                    paymentDate: new Date(),
                    clearedDate: new Date(),
                },
            });

            // Allocate payment to installments and particulars
            const { allocations, particularUpdates } = await allocatePaymentToInstallments(
                tx,
                studentFeeId,
                payment.id,
                amount
            );

            // Update StudentFee totals
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

            return { payment, allocations, particularUpdates };
        });

        return NextResponse.json({
            success: true,
            message: "Payment recorded successfully",
            payment: result.payment,
            allocations: result.allocations,
            particularsUpdated: Object.keys(result.particularUpdates).length
        });
    } catch (error) {
        console.error("Record Payment Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to record payment" },
            { status: 400 }
        );
    }
}

// ============================================
// 4. UPDATE PAYMENT VERIFICATION
// Location: app/api/schools/fee/payments/online/verify/route.js
// ============================================

// REPLACE the existing verification logic with:
import { allocatePaymentToInstallments } from "@/lib/payment-allocation";

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            paymentId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            simulationSuccess = true,
        } = body;

        if (!paymentId) {
            return NextResponse.json(
                { error: "paymentId required" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.feePayment.findUnique({
                where: { id: paymentId },
                include: { studentFee: true },
            });

            if (!payment) {
                throw new Error("Payment record not found");
            }

            if (payment.status !== "PENDING") {
                throw new Error("Payment already processed");
            }

            const isValid = simulationSuccess;

            if (!isValid) {
                await tx.feePayment.update({
                    where: { id: paymentId },
                    data: {
                        status: "FAILED",
                        failureReason: "Signature verification failed",
                    },
                });
                throw new Error("Payment verification failed");
            }

            // Update payment status
            await tx.feePayment.update({
                where: { id: paymentId },
                data: {
                    status: "SUCCESS",
                    gatewayPaymentId: razorpayPaymentId || `pay_${Date.now()}`,
                    transactionId: razorpayPaymentId || `txn_${Date.now()}`,
                    clearedDate: new Date(),
                },
            });

            // USE THE SHARED ALLOCATION FUNCTION
            const { allocations } = await allocatePaymentToInstallments(
                tx,
                payment.studentFeeId,
                payment.id,
                payment.amount
            );

            // Update student fee
            const studentFee = payment.studentFee;
            const newPaidAmount = studentFee.paidAmount + payment.amount;
            const newBalanceAmount = studentFee.finalAmount - newPaidAmount;
            const newStatus =
                newBalanceAmount <= 0 ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "UNPAID";

            await tx.studentFee.update({
                where: { id: payment.studentFeeId },
                data: {
                    paidAmount: newPaidAmount,
                    balanceAmount: newBalanceAmount,
                    status: newStatus,
                    lastPaymentDate: new Date(),
                },
            });

            return { payment, allocations };
        });

        return NextResponse.json({
            success: true,
            message: "Payment verified successfully",
            payment: result.payment,
            allocations: result.allocations,
        });
    } catch (error) {
        console.error("Verify Payment Error:", error);
        return NextResponse.json(
            { error: error.message || "Payment verification failed" },
            { status: 400 }
        );
    }
}

// ============================================
// IMPLEMENTATION STEPS
// ============================================

/*
STEP 1: Update Schema
-----------------------
1. Open prisma/schema.prisma
2. Add the InstallmentParticular model
3. Update StudentFeeInstallment and StudentFeeParticular
4. Run: npx prisma migrate dev --name add_installment_particulars
5. Run: npx prisma generate

STEP 2: Create Shared Function
--------------------------------
1. Create lib/payment-allocation.js
2. Copy the allocatePaymentToInstallments function
3. Export it

STEP 3: Create/Update APIs
----------------------------
1. Create app/api/schools/fee/payments/record/route.js (new file)
2. Update app/api/schools/fee/payments/online/verify/route.js
3. Both should import and use allocatePaymentToInstallments

STEP 4: Update Fee Assignment
-------------------------------
Update app/api/schools/fee/assign/route.js to create InstallmentParticular records
(See the enhanced_fee_assignment_enhanced artifact)

STEP 5: Update Frontend APIs
------------------------------
Update these to fetch particularBreakdowns:
- app/api/schools/fee/students/[studentId]/route.js
- app/api/schools/fee/parent/my-fees/route.js
(See the enhanced APIs artifacts)

STEP 6: Test
-------------
1. Assign a fee structure to a student
2. Check if InstallmentParticular records are created
3. Make a payment
4. Verify payment is distributed correctly across:
   - Installments
   - Particulars within installments
*/