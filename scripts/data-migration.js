// ============================================
// DATA MIGRATION SCRIPT
// scripts/migrate-installment-particulars.js
// ============================================

// /*
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateInstallmentParticulars() {
    console.log('Starting migration...');

    // Get all student fees with installments and particulars
    const studentFees = await prisma.studentFee.findMany({
        include: {
            installments: true,
            particulars: true,
            globalFeeStructure: {
                include: {
                    installmentRules: {
                        orderBy: { installmentNumber: 'asc' }
                    }
                }
            }
        }
    });

    console.log(`Found ${studentFees.length} student fees to migrate`);

    for (const studentFee of studentFees) {
        console.log(`Processing student fee: ${studentFee.id}`);

        for (const installment of studentFee.installments) {
            // Find the corresponding installment rule
            const rule = studentFee.globalFeeStructure?.installmentRules?.find(
                r => r.installmentNumber === installment.installmentNumber
            );

            const percentage = rule ? rule.percentage / 100 : 1;

            // Create InstallmentParticular records for each particular
            for (const particular of studentFee.particulars) {
                const amountInInstallment = particular.amount * percentage;

                await prisma.installmentParticular.create({
                    data: {
                        installmentId: installment.id,
                        particularId: particular.id,
                        amount: amountInInstallment,
                        paidAmount: 0 // Will be calculated from payment history
                    }
                });
            }
        }
    }

    console.log('Migration completed successfully!');
}

migrateInstallmentParticulars()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
