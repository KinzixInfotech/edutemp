import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFeeData() {
  const schoolId = '140d4c69-f100-4432-b1b9-4e35b7e723af';
  const academicYearId = '6dbd3745-9fd5-479e-ba36-6900856ffe1a';

  console.log('Checking fee data...\n');

  // Check StudentFee records
  const studentFees = await prisma.studentFee.findMany({
    where: { schoolId, academicYearId },
    select: {
      id: true,
      studentId: true,
      originalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      discountAmount: true,
      status: true,
    },
    take: 5
  });

  console.log(`Total StudentFee records: ${studentFees.length}`);
  if (studentFees.length > 0) {
    console.log('Sample records:');
    console.log(JSON.stringify(studentFees, null, 2));
  }

  // Check FeePayment records
  const payments = await prisma.feePayment.findMany({
    where: { schoolId, academicYearId },
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      status: true,
      paymentDate: true,
    },
    take: 5
  });

  console.log(`\nTotal FeePayment records: ${payments.length}`);
  if (payments.length > 0) {
    console.log('Sample payments:');
    console.log(JSON.stringify(payments, null, 2));
  }

  await prisma.$disconnect();
}

checkFeeData().catch(console.error);
