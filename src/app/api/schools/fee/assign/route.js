// ============================================
// FIX: Proper Installment Creation Based on Fee Mode
// app/api/schools/fee/assign/route.js
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      globalFeeStructureId,
      studentIds,
      applyToClass,
      classId,
      sectionId,
      academicYearId,
      schoolId,
    } = body;

    if (!schoolId || !academicYearId) {
      return NextResponse.json(
        { error: "schoolId and academicYearId required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch global structure
      const globalStructure = await tx.globalFeeStructure.findUnique({
        where: { id: globalFeeStructureId },
        include: {
          particulars: { orderBy: { displayOrder: 'asc' } },
          installmentRules: { orderBy: { installmentNumber: 'asc' } },
        },
      });

      if (!globalStructure) {
        throw new Error("Fee structure not found");
      }

      // Determine students
      let studentsToAssign = [];
      if (applyToClass && classId) {
        const where = {
          schoolId,
          academicYearId,
          classId: parseInt(classId),
          ...(sectionId && { sectionId: parseInt(sectionId) }),
        };
        studentsToAssign = await tx.student.findMany({ where });
      } else if (studentIds && studentIds.length > 0) {
        studentsToAssign = await tx.student.findMany({
          where: {
            userId: { in: studentIds },
            schoolId,
            academicYearId,
          },
        });
      } else {
        throw new Error("No students specified");
      }

      if (studentsToAssign.length === 0) {
        throw new Error("No eligible students found");
      }

      const assignedStudents = [];
      const skippedStudents = [];

      for (const student of studentsToAssign) {
        // Check existing
        const existing = await tx.studentFee.findUnique({
          where: {
            studentId_academicYearId: {
              studentId: student.userId,
              academicYearId,
            },
          },
        });

        if (existing) {
          skippedStudents.push({
            studentId: student.userId,
            name: student.name,
            reason: "Already assigned",
          });
          continue;
        }

        // ===================================
        // STEP 1: Create StudentFee
        // ===================================
        const studentFee = await tx.studentFee.create({
          data: {
            studentId: student.userId,
            schoolId,
            academicYearId,
            globalFeeStructureId: globalStructure.id,
            originalAmount: globalStructure.totalAmount,
            finalAmount: globalStructure.totalAmount,
            balanceAmount: globalStructure.totalAmount,
            status: "UNPAID",
          },
        });

        // ===================================
        // STEP 2: Create StudentFeeParticulars
        // ===================================
        const createdParticulars = [];
        for (const particular of globalStructure.particulars) {
          const particularRecord = await tx.studentFeeParticular.create({
            data: {
              studentFeeId: studentFee.id,
              globalParticularId: particular.id,
              name: particular.name,
              amount: particular.amount,
              status: "UNPAID",
            },
          });
          createdParticulars.push(particularRecord);
        }

        // ===================================
        // STEP 3: Create Installments
        // ===================================
        
        // CHECK: Does global structure have installment rules?
        if (globalStructure.installmentRules && globalStructure.installmentRules.length > 0) {
          // USE EXISTING RULES
          for (const rule of globalStructure.installmentRules) {
            const installment = await tx.studentFeeInstallment.create({
              data: {
                studentFeeId: studentFee.id,
                installmentRuleId: rule.id,
                installmentNumber: rule.installmentNumber,
                dueDate: rule.dueDate,
                amount: rule.amount, // Amount from rule
                status: "PENDING",
              },
            });

            // Create InstallmentParticular breakdown
            const percentage = rule.percentage / 100;
            for (const particular of createdParticulars) {
              await tx.installmentParticular.create({
                data: {
                  installmentId: installment.id,
                  particularId: particular.id,
                  amount: particular.amount * percentage,
                  paidAmount: 0,
                },
              });
            }
          }
        } else {
          // NO RULES: AUTO-GENERATE based on mode
          const installmentsToCreate = getInstallmentsByMode(
            globalStructure.mode,
            globalStructure.totalAmount,
            new Date()
          );

          for (let i = 0; i < installmentsToCreate.length; i++) {
            const inst = installmentsToCreate[i];
            
            const installment = await tx.studentFeeInstallment.create({
              data: {
                studentFeeId: studentFee.id,
                installmentNumber: i + 1,
                dueDate: inst.dueDate,
                amount: inst.amount,
                status: "PENDING",
              },
            });

            // Create InstallmentParticular breakdown
            const percentage = inst.percentage / 100;
            for (const particular of createdParticulars) {
              await tx.installmentParticular.create({
                data: {
                  installmentId: installment.id,
                  particularId: particular.id,
                  amount: particular.amount * percentage,
                  paidAmount: 0,
                },
              });
            }
          }
        }

        assignedStudents.push({
          studentId: student.userId,
          name: student.name,
        });
      }

      return {
        assigned: assignedStudents.length,
        skipped: skippedStudents.length,
        assignedStudents,
        skippedStudents,
      };
    });

    return NextResponse.json({
      message: "Fee assignment completed",
      ...result,
    });
  } catch (error) {
    console.error("Assign Fee Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign fees" },
      { status: 400 }
    );
  }
}

// ===================================
// HELPER: Generate installments by mode
// ===================================
function getInstallmentsByMode(mode, totalAmount, startDate) {
  const installments = [];
  let numberOfInstallments = 1;
  let currentDate = new Date(startDate);

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

  const amountPerInstallment = totalAmount / numberOfInstallments;
  const percentagePerInstallment = 100 / numberOfInstallments;

  for (let i = 0; i < numberOfInstallments; i++) {
    // Calculate due date
    let dueDate = new Date(currentDate);
    
    if (mode === "MONTHLY") {
      dueDate.setMonth(currentDate.getMonth() + i);
      dueDate.setDate(10); // Due on 10th of each month
    } else if (mode === "QUARTERLY") {
      dueDate.setMonth(currentDate.getMonth() + (i * 3));
      dueDate.setDate(15); // Due on 15th
    } else if (mode === "HALF_YEARLY") {
      dueDate.setMonth(currentDate.getMonth() + (i * 6));
      dueDate.setDate(15);
    } else {
      dueDate.setMonth(currentDate.getMonth() + 1);
      dueDate.setDate(15);
    }

    installments.push({
      installmentNumber: i + 1,
      dueDate,
      amount: amountPerInstallment,
      percentage: percentagePerInstallment,
    });
  }

  return installments;
}

// ===================================
// EXAMPLE OUTPUT for MONTHLY mode:
// ===================================
/*
Total: ₹1,04,000
Particulars:
  - Bus fees: ₹50,000
  - Other fees: ₹54,000

Generated Installments:
[
  {
    installmentNumber: 1,
    dueDate: "2025-12-10",
    amount: 8666.67,  // ₹1,04,000 ÷ 12
    percentage: 8.33,
    particularBreakdowns: [
      { name: "Bus fees", amount: 4166.67 },    // ₹50,000 ÷ 12
      { name: "Other fees", amount: 4500 }       // ₹54,000 ÷ 12
    ]
  },
  {
    installmentNumber: 2,
    dueDate: "2026-01-10",
    amount: 8666.67,
    percentage: 8.33,
    particularBreakdowns: [
      { name: "Bus fees", amount: 4166.67 },
      { name: "Other fees", amount: 4500 }
    ]
  },
  // ... 10 more installments
]
*/