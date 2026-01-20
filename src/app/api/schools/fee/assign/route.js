// ============================================
// FIX: Proper Installment Creation Based on Fee Mode
// app/api/schools/fee/assign/route.js
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const { globalFeeStructureId, studentIds, applyToClass, classId, sectionId, academicYearId, schoolId } = await req.json();

    if (!schoolId || !academicYearId) {
      return NextResponse.json({ error: "schoolId and academicYearId required" }, { status: 400 });
    }

    // Fetch global structure and academic year together
    const [globalStructure, academicYear] = await Promise.all([
      prisma.globalFeeStructure.findUnique({
        where: { id: globalFeeStructureId },
        include: {
          particulars: { orderBy: { displayOrder: 'asc' } },
          installmentRules: { orderBy: { installmentNumber: 'asc' } },
        },
      }),
      prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { startDate: true, endDate: true }
      })
    ]);

    if (!globalStructure) throw new Error("Fee structure not found");
    if (!academicYear) throw new Error("Academic year not found");
    if (globalStructure.status === 'ARCHIVED') throw new Error("Cannot assign to ARCHIVED fee structure");

    // Fetch students
    let studentsToAssign = [];
    if (applyToClass && classId) {
      studentsToAssign = await prisma.student.findMany({
        where: {
          schoolId,
          classId: parseInt(classId),
          ...(sectionId && !isNaN(parseInt(sectionId)) && { sectionId: parseInt(sectionId) }),
        },
      });
    } else if (studentIds?.length > 0) {
      studentsToAssign = await prisma.student.findMany({
        where: { userId: { in: studentIds }, schoolId },
      });
    } else {
      throw new Error("No students specified");
    }

    if (studentsToAssign.length === 0) throw new Error("No eligible students found");

    // Auto-transition DRAFT to ACTIVE
    if (globalStructure.status === 'DRAFT') {
      await prisma.globalFeeStructure.update({
        where: { id: globalFeeStructureId },
        data: { status: 'ACTIVE' },
      });
    }

    const assignedStudents = [], skippedStudents = [];

    // Assign Loop
    for (const student of studentsToAssign) {
      try {
        await prisma.$transaction(async (tx) => {
          const existing = await tx.studentFee.findFirst({
            where: { studentId: student.userId, academicYearId },
          });

          if (existing) {
            skippedStudents.push({ studentId: student.userId, name: student.name, reason: "Already assigned" });
            return;
          }

          // Create StudentFee
          const studentFee = await tx.studentFee.create({
            data: {
              studentId: student.userId, schoolId, academicYearId,
              globalFeeStructureId: globalStructure.id,
              originalAmount: globalStructure.totalAmount,
              finalAmount: globalStructure.totalAmount,
              balanceAmount: globalStructure.totalAmount,
              status: "UNPAID",
            },
          });

          // Create StudentFeeParticulars
          const createdParticulars = await Promise.all(
            globalStructure.particulars.map(p =>
              tx.studentFeeParticular.create({
                data: {
                  studentFeeId: studentFee.id,
                  globalParticularId: p.id,
                  name: p.name,
                  amount: p.amount,
                  status: "UNPAID",
                },
              })
            )
          );

          // Get installments (from rules or generate)
          const installments = globalStructure.installmentRules?.length > 0
            ? globalStructure.installmentRules.map(r => ({
              installmentNumber: r.installmentNumber,
              dueDate: r.dueDate,
              amount: r.amount,
              percentage: r.percentage,
              ruleId: r.id,
            }))
            : getInstallmentsByMode(globalStructure.mode, globalStructure.totalAmount, academicYear.startDate, academicYear.endDate);

          // Create installments with particular breakdowns
          for (const inst of installments) {
            const installment = await tx.studentFeeInstallment.create({
              data: {
                studentFeeId: studentFee.id,
                installmentRuleId: inst.ruleId || null,
                installmentNumber: inst.installmentNumber,
                dueDate: inst.dueDate,
                amount: inst.amount,
                status: "PENDING",
              },
            });

            // Create particular breakdowns
            const percentage = inst.percentage / 100;
            await tx.installmentParticular.createMany({
              data: createdParticulars.map(p => ({
                installmentId: installment.id,
                particularId: p.id,
                amount: p.amount * percentage,
                paidAmount: 0,
              })),
            });
          }

          assignedStudents.push({ studentId: student.userId, name: student.name });
        }, { maxWait: 5000, timeout: 10000 });

      } catch (err) {
        skippedStudents.push({
          studentId: student.userId,
          name: student.name,
          reason: err.code === 'P2002' ? "Already assigned" : err.message,
        });
      }
    }

    return NextResponse.json({
      message: "Fee assignment completed",
      assigned: assignedStudents.length,
      skipped: skippedStudents.length,
      assignedStudents,
      skippedStudents,
    });
  } catch (error) {
    console.error("Assign Fee Error:", error);
    return NextResponse.json({ error: error.message || "Failed to assign fees" }, { status: 400 });
  }
}

// ===================================
// HELPER: Generate installments using academic year dates
// ===================================
function getInstallmentsByMode(mode, totalAmount, yearStart, yearEnd) {
  const startDate = new Date(yearStart);
  const endDate = yearEnd ? new Date(yearEnd) : null;

  let numberOfInstallments = 1;

  // Calculate actual months if MONTHLY and we have end date
  if (endDate && mode === "MONTHLY") {
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) + 1;
    numberOfInstallments = Math.max(1, Math.min(months, 12));
  } else {
    switch (mode) {
      case "MONTHLY": numberOfInstallments = 12; break;
      case "QUARTERLY": numberOfInstallments = 4; break;
      case "HALF_YEARLY": numberOfInstallments = 2; break;
      default: numberOfInstallments = 1;
    }
  }

  // Proper rounding
  const baseAmount = Math.floor((totalAmount / numberOfInstallments) * 100) / 100;
  const remainder = Math.round((totalAmount - baseAmount * numberOfInstallments) * 100) / 100;
  const percentagePerInstallment = Math.round((100 / numberOfInstallments) * 100) / 100;

  const installments = [];
  for (let i = 0; i < numberOfInstallments; i++) {
    const dueDate = new Date(startDate);

    if (mode === "MONTHLY") {
      dueDate.setMonth(startDate.getMonth() + i);
      dueDate.setDate(10);
    } else if (mode === "QUARTERLY") {
      dueDate.setMonth(startDate.getMonth() + (i * 3));
      dueDate.setDate(15);
    } else if (mode === "HALF_YEARLY") {
      dueDate.setMonth(startDate.getMonth() + (i * 6));
      dueDate.setDate(15);
    } else {
      dueDate.setDate(15);
    }

    const isLast = i === numberOfInstallments - 1;
    installments.push({
      installmentNumber: i + 1,
      dueDate,
      amount: isLast ? baseAmount + remainder : baseAmount,
      percentage: percentagePerInstallment,
    });
  }

  return installments;
}