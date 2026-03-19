require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(process.env.DATABASE_URL ? { datasources: { db: { url: process.env.DATABASE_URL } } } : undefined);

async function main() {
  try {
    const studentId = 'd631c871-5641-4a0d-8358-e6d69d225bac';
    const academicYearId = '3596a7e7-8ed4-44e2-9800-b1bc4c348785';
    
    console.log("Fetching...");
    const studentFee = await prisma.studentFee.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId,
        },
      },
      include: {
        student: {
          select: {
            userId: true, name: true, admissionNo: true, rollNumber: true, admissionDate: true,
            class: { select: { className: true } },
            section: { select: { name: true } },
            schoolId: true,
          },
        },
        globalFeeStructure: {
          select: {
            name: true, mode: true,
            installmentRules: { orderBy: { installmentNumber: 'asc' } },
          },
        },
        particulars: { orderBy: { name: 'asc' } },
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' }, where: { status: 'SUCCESS' } },
        discounts: { include: { approver: { select: { name: true } } } },
      },
    });
    console.log("studentFee fetched:", studentFee ? "YES" : "NO");
    
    // Test what else fails
    console.log("Trying to find feeSession...");
    const resolvedSession = await prisma.feeSession.findUnique({ where: { id: "3596a7e7-8ed4-44e2-9800-b1bc4c348785" } });
    console.log("resolvedSession fetched:", resolvedSession ? "YES" : "NO");

  } catch (e) {
    console.error("ERROR CAUGHT", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
