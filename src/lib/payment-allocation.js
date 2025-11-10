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