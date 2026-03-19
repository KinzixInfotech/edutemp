require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.studentFee.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: 'd631c871-5641-4a0d-8358-e6d69d225bac',
          academicYearId: '3596a7e7-8ed4-44e2-9800-b1bc4c348785'
        }
      },
      include: {
        student: {
          select: {
            userId: true, name: true, admissionNo: true, rollNumber: true, admissionDate: true,
            class: { select: { className: true } },
            section: { select: { name: true } },
            schoolId: true
          }
        },
        globalFeeStructure: {
          select: {
            name: true, mode: true,
            installmentRules: { orderBy: { installmentNumber: 'asc' } }
          }
        },
        particulars: { orderBy: { name: 'asc' } },
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' }, where: { status: 'SUCCESS' } },
        discounts: { include: { approver: { select: { name: true } } } }
      }
    });
    require('fs').writeFileSync('prisma-out.json', JSON.stringify(res, null, 2));
    console.log('Success');
  } catch(e) {
    require('fs').writeFileSync('prisma-error.txt', e.stack || e.message);
    console.error('Failed', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
