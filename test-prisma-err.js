const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.studentFee.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: '123e4567-e89b-12d3-a456-426614174000',
          academicYearId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      include: {
        student: {
          select: {
            userId: true,
            name: true,
            admissionNo: true,
            rollNumber: true,
            admissionDate: true,
            class: { select: { className: true } },
            section: { select: { name: true } },
            schoolId: true,
          },
        },
        globalFeeStructure: {
          select: {
            name: true,
            mode: true,
            installmentRules: { orderBy: { installmentNumber: 'asc' } },
          },
        },
        particulars: { orderBy: { name: 'asc' } },
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' }, where: { status: 'SUCCESS' } },
        discounts: { include: { approver: { select: { name: true } } } },
      },
    });
    console.log("Success");
  } catch (e) {
    console.error(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
