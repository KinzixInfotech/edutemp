// ============================================
// SCRIPT 2: Reset Overdue Installments (Back to Normal)
// Location: scripts/test-reset-overdue.js
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetOverdueInstallments() {
    console.log('\n🔄 RESET MODE: Restoring installments to normal state...\n');

    try {
        const now = new Date();

        // Get all overdue installments
        const overdueInstallments = await prisma.studentFeeInstallment.findMany({
            where: {
                isOverdue: true,
            },
            include: {
                studentFee: {
                    include: {
                        student: {
                            select: {
                                name: true,
                                admissionNo: true,
                            },
                        },
                        globalFeeStructure: {
                            select: {
                                mode: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                installmentNumber: 'asc',
            },
        });

        console.log(`Found ${overdueInstallments.length} overdue installments to reset\n`);

        if (overdueInstallments.length === 0) {
            console.log('✅ No overdue installments found. Everything is already normal!');
            return;
        }

        let resetCount = 0;
        const resets = [];

        for (const installment of overdueInstallments) {
            // Calculate proper future due date based on installment number and mode
            const mode = installment.studentFee.globalFeeStructure?.mode || 'MONTHLY';
            const newDueDate = new Date();

            if (mode === 'MONTHLY') {
                newDueDate.setMonth(now.getMonth() + installment.installmentNumber);
                newDueDate.setDate(10); // Due on 10th
            } else if (mode === 'QUARTERLY') {
                newDueDate.setMonth(now.getMonth() + (installment.installmentNumber * 3));
                newDueDate.setDate(15);
            } else if (mode === 'HALF_YEARLY') {
                newDueDate.setMonth(now.getMonth() + (installment.installmentNumber * 6));
                newDueDate.setDate(15);
            } else {
                newDueDate.setMonth(now.getMonth() + 1);
                newDueDate.setDate(15);
            }

            // Update installment
            await prisma.studentFeeInstallment.update({
                where: { id: installment.id },
                data: {
                    dueDate: newDueDate,
                    isOverdue: false,
                },
            });

            resets.push({
                student: installment.studentFee.student.name,
                admissionNo: installment.studentFee.student.admissionNo,
                installmentNumber: installment.installmentNumber,
                oldDueDate: installment.dueDate.toISOString().split('T')[0],
                newDueDate: newDueDate.toISOString().split('T')[0],
                mode,
            });

            resetCount++;
        }

        // Update student fee statuses back to normal
        const studentFees = await prisma.studentFee.findMany({
            where: {
                status: { in: ['OVERDUE', 'PARTIAL'] },
            },
            include: {
                installments: true,
            },
        });

        let statusResetCount = 0;
        for (const fee of studentFees) {
            // Check if still has any overdue
            const stillHasOverdue = fee.installments.some(
                inst => inst.isOverdue && inst.status !== 'PAID'
            );

            if (!stillHasOverdue) {
                const newStatus = fee.paidAmount >= fee.finalAmount
                    ? 'PAID'
                    : fee.paidAmount > 0
                        ? 'PARTIAL'
                        : 'UNPAID';

                await prisma.studentFee.update({
                    where: { id: fee.id },
                    data: { status: newStatus },
                });
                statusResetCount++;
            }
        }

        console.log('✅ RESET COMPLETE!\n');
        console.log('=================================');
        console.log(`📊 Summary:`);
        console.log(`   - Installments reset: ${resetCount}`);
        console.log(`   - Student fees reset: ${statusResetCount}`);
        console.log('=================================\n');

        console.log('📋 Detailed Resets:\n');

        // Group by student
        const studentGroups = {};
        resets.forEach(reset => {
            const key = `${reset.student} (${reset.admissionNo})`;
            if (!studentGroups[key]) {
                studentGroups[key] = [];
            }
            studentGroups[key].push(reset);
        });

        Object.entries(studentGroups).forEach(([student, installments]) => {
            console.log(`\n👤 ${student} [${installments[0].mode}]`);
            installments.forEach(inst => {
                console.log(`   └─ Installment ${inst.installmentNumber}:`);
                console.log(`      Old: ${inst.oldDueDate} → New: ${inst.newDueDate} ✅`);
            });
        });

        console.log('\n\n🎯 Everything is back to normal!');
        console.log('   ✅ All overdue flags removed');
        console.log('   ✅ Due dates reset to future');
        console.log('   ✅ Student fee statuses updated');
        console.log('\n💡 To test overdue again: Run "node scripts/test-make-overdue.js"\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// Run script
resetOverdueInstallments()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

// ============================================
// EXPECTED OUTPUT:
// ============================================
/*
🔄 RESET MODE: Restoring installments to normal state...

Found 36 overdue installments to reset

✅ RESET COMPLETE!

=================================
📊 Summary:
   - Installments reset: 36
   - Student fees reset: 3
=================================

📋 Detailed Resets:

👤 Arsh Kumar (2024001) [MONTHLY]
   └─ Installment 1:
      Old: 2024-11-02 → New: 2024-12-10 ✅
   └─ Installment 2:
      Old: 2024-11-02 → New: 2025-01-10 ✅
   └─ Installment 3:
      Old: 2024-11-02 → New: 2025-02-10 ✅
   └─ Installment 4:
      Old: 2024-10-10 → New: 2025-03-10 ✅
   └─ Installment 5:
      Old: 2024-10-10 → New: 2025-04-10 ✅
   └─ Installment 6:
      Old: 2024-10-10 → New: 2025-05-10 ✅
   └─ Installment 7:
      Old: 2024-09-10 → New: 2025-06-10 ✅
   └─ Installment 8:
      Old: 2024-09-10 → New: 2025-07-10 ✅
   └─ Installment 9:
      Old: 2024-09-10 → New: 2025-08-10 ✅
   └─ Installment 10:
      Old: 2024-09-10 → New: 2025-09-10 ✅
   └─ Installment 11:
      Old: 2024-09-10 → New: 2025-10-10 ✅
   └─ Installment 12:
      Old: 2024-09-10 → New: 2025-11-10 ✅

🎯 Everything is back to normal!
   ✅ All overdue flags removed
   ✅ Due dates reset to future
   ✅ Student fee statuses updated

💡 To test overdue again: Run "node scripts/test-make-overdue.js"
*/