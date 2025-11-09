// ============================================
// MIGRATION SCRIPT: Fix Existing Fee Structures
// Location: scripts/fix-installments.js
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to generate installment rules
function generateInstallmentRules(mode, totalAmount, startDate = new Date()) {
  const rules = [];
  let numberOfInstallments = 1;
  const currentDate = new Date(startDate);

  // Determine number of installments
  switch (mode) {
    case "MONTHLY":
      numberOfInstallments = 12;
      break;
    case "QUARTERLY":
      numberOfInstallments = 4;
      break;
    case "HALF_YEARLY":
      numberOfInstallments = 2;
      break;
    case "YEARLY":
    case "ONE_TIME":
      numberOfInstallments = 1;
      break;
    default:
      numberOfInstallments = 1;
  }

  const percentagePerInstallment = 100 / numberOfInstallments;
  const amountPerInstallment = totalAmount / numberOfInstallments;

  for (let i = 0; i < numberOfInstallments; i++) {
    let dueDate = new Date(currentDate);
    
    if (mode === "MONTHLY") {
      dueDate.setMonth(currentDate.getMonth() + i + 1);
      dueDate.setDate(10);
    } else if (mode === "QUARTERLY") {
      dueDate.setMonth(currentDate.getMonth() + (i * 3) + 1);
      dueDate.setDate(15);
    } else if (mode === "HALF_YEARLY") {
      dueDate.setMonth(currentDate.getMonth() + (i * 6) + 1);
      dueDate.setDate(15);
    } else {
      dueDate.setMonth(currentDate.getMonth() + 1);
      dueDate.setDate(15);
    }

    rules.push({
      installmentNumber: i + 1,
      dueDate,
      percentage: percentagePerInstallment,
      amount: amountPerInstallment,
      lateFeeAmount: 100,
      lateFeeAfterDays: 7,
    });
  }

  return rules;
}

// ============================================
// STEP 1: Fix GlobalFeeStructure (Add Installment Rules)
// ============================================
async function fixGlobalFeeStructures() {
  console.log('\n📋 STEP 1: Fixing Global Fee Structures...\n');

  const structures = await prisma.globalFeeStructure.findMany({
    include: {
      installmentRules: true,
      particulars: true,
    }
  });

  console.log(`Found ${structures.length} global fee structures`);

  for (const structure of structures) {
    console.log(`\n  Processing: ${structure.name}`);
    console.log(`  Mode: ${structure.mode}`);
    console.log(`  Total: ₹${structure.totalAmount}`);
    console.log(`  Existing rules: ${structure.installmentRules.length}`);

    // Check if already has rules
    if (structure.installmentRules.length > 0) {
      console.log(`  ✅ Already has installment rules, skipping`);
      continue;
    }

    // Generate rules
    const rules = generateInstallmentRules(
      structure.mode,
      structure.totalAmount,
      structure.createdAt
    );

    console.log(`  📝 Generating ${rules.length} installment rules...`);

    // Create rules
    for (const rule of rules) {
      await prisma.feeInstallmentRule.create({
        data: {
          globalFeeStructureId: structure.id,
          installmentNumber: rule.installmentNumber,
          dueDate: rule.dueDate,
          percentage: rule.percentage,
          amount: rule.amount,
          lateFeeAmount: rule.lateFeeAmount,
          lateFeeAfterDays: rule.lateFeeAfterDays,
        },
      });
    }

    console.log(`  ✅ Created ${rules.length} installment rules`);
  }

  console.log('\n✅ Global Fee Structures Fixed!\n');
}

// ============================================
// STEP 2: Fix StudentFee (Recreate Installments)
// ============================================
async function fixStudentFees() {
  console.log('\n📋 STEP 2: Fixing Student Fees...\n');

  const studentFees = await prisma.studentFee.findMany({
    include: {
      installments: true,
      particulars: true,
      globalFeeStructure: {
        include: {
          installmentRules: { orderBy: { installmentNumber: 'asc' } }
        }
      }
    }
  });

  console.log(`Found ${studentFees.length} student fees to fix`);

  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const studentFee of studentFees) {
    try {
      console.log(`\n  Processing Student Fee: ${studentFee.id}`);
      console.log(`  Current installments: ${studentFee.installments.length}`);

      // Check if needs fixing
      const hasWrongInstallments = studentFee.installments.some(
        inst => inst.amount === studentFee.originalAmount
      );

      if (!hasWrongInstallments && studentFee.installments.length > 1) {
        console.log(`  ✅ Installments look correct, skipping`);
        skippedCount++;
        continue;
      }

      // Delete old installments and their breakdowns
      console.log(`  🗑️  Deleting old installments...`);
      
      // First delete InstallmentParticular records
      for (const installment of studentFee.installments) {
        await prisma.installmentParticular.deleteMany({
          where: { installmentId: installment.id }
        });
      }

      // Then delete installments
      await prisma.studentFeeInstallment.deleteMany({
        where: { studentFeeId: studentFee.id }
      });

      // Create new installments from global rules
      if (!studentFee.globalFeeStructure?.installmentRules?.length) {
        console.log(`  ⚠️  No global rules found, creating single installment`);
        
        const installment = await prisma.studentFeeInstallment.create({
          data: {
            studentFeeId: studentFee.id,
            installmentNumber: 1,
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            amount: studentFee.originalAmount,
            status: studentFee.paidAmount > 0 ? "PARTIAL" : "PENDING",
            paidAmount: studentFee.paidAmount,
          },
        });

        // Create breakdowns
        for (const particular of studentFee.particulars) {
          await prisma.installmentParticular.create({
            data: {
              installmentId: installment.id,
              particularId: particular.id,
              amount: particular.amount,
              paidAmount: particular.paidAmount,
            },
          });
        }
      } else {
        console.log(`  📝 Creating ${studentFee.globalFeeStructure.installmentRules.length} new installments...`);

        for (const rule of studentFee.globalFeeStructure.installmentRules) {
          const percentage = rule.percentage / 100;
          
          // Determine status based on existing payments
          let installmentPaidAmount = 0;
          let installmentStatus = "PENDING";
          
          if (studentFee.paidAmount > 0) {
            // Distribute paid amount proportionally
            installmentPaidAmount = Math.min(
              rule.amount,
              studentFee.paidAmount * percentage
            );
            
            if (installmentPaidAmount >= rule.amount) {
              installmentStatus = "PAID";
            } else if (installmentPaidAmount > 0) {
              installmentStatus = "PARTIAL";
            }
          }

          const installment = await prisma.studentFeeInstallment.create({
            data: {
              studentFeeId: studentFee.id,
              installmentRuleId: rule.id,
              installmentNumber: rule.installmentNumber,
              dueDate: rule.dueDate,
              amount: rule.amount,
              paidAmount: installmentPaidAmount,
              status: installmentStatus,
              ...(installmentStatus === "PAID" && { paidDate: new Date() }),
            },
          });

          // Create InstallmentParticular breakdowns
          for (const particular of studentFee.particulars) {
            const particularInInstallment = particular.amount * percentage;
            const particularPaidInInstallment = particular.paidAmount * percentage;

            await prisma.installmentParticular.create({
              data: {
                installmentId: installment.id,
                particularId: particular.id,
                amount: particularInInstallment,
                paidAmount: particularPaidInInstallment,
              },
            });
          }
        }
      }

      console.log(`  ✅ Fixed successfully`);
      fixedCount++;

    } catch (error) {
      console.error(`  ❌ Error fixing student fee ${studentFee.id}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=================================');
  console.log('SUMMARY:');
  console.log(`✅ Fixed: ${fixedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('=================================\n');
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
  console.log('\n🔧 INSTALLMENT MIGRATION SCRIPT');
  console.log('================================\n');

  try {
    // Step 1: Fix global structures
    await fixGlobalFeeStructures();

    // Step 2: Fix student fees
    await fixStudentFees();

    console.log('\n✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ============================================
// HOW TO RUN THIS SCRIPT
// ============================================
/*

1. Save this file as: scripts/fix-installments.js

2. Make it executable:
   chmod +x scripts/fix-installments.js

3. Run the script:
   node scripts/fix-installments.js

4. Check the output for:
   - How many structures were fixed
   - How many student fees were fixed
   - Any errors

5. Verify in your app:
   - Open the fee payment screen
   - Check if installments now show correct amounts
   - For MONTHLY mode with ₹1,04,000 total:
     * Should show 12 installments of ₹8,667 each
     * Each installment should show particular breakdown

IMPORTANT:
- Backup your database before running!
- Run on a test/staging environment first
- The script is idempotent (safe to run multiple times)

*/

// ============================================
// EXPECTED OUTPUT EXAMPLE
// ============================================
/*

🔧 INSTALLMENT MIGRATION SCRIPT
================================

📋 STEP 1: Fixing Global Fee Structures...

Found 3 global fee structures

  Processing: CLASS 3 FEE STRUCTURE
  Mode: MONTHLY
  Total: ₹104000
  Existing rules: 0
  📝 Generating 12 installment rules...
  ✅ Created 12 installment rules

  Processing: CLASS 4 FEE STRUCTURE
  Mode: QUARTERLY
  Total: ₹85000
  Existing rules: 0
  📝 Generating 4 installment rules...
  ✅ Created 4 installment rules

✅ Global Fee Structures Fixed!

📋 STEP 2: Fixing Student Fees...

Found 5 student fees to fix

  Processing Student Fee: fee-uuid-1
  Current installments: 1
  🗑️  Deleting old installments...
  📝 Creating 12 new installments...
  ✅ Fixed successfully

  Processing Student Fee: fee-uuid-2
  Current installments: 12
  ✅ Installments look correct, skipping

=================================
SUMMARY:
✅ Fixed: 4
⏭️  Skipped: 1
❌ Errors: 0
=================================

✅ Migration completed successfully!

*/