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

    // 1. Fetch Global Structure (No TX)
    const globalStructure = await prisma.globalFeeStructure.findUnique({
      where: { id: globalFeeStructureId },
      include: {
        particulars: { orderBy: { displayOrder: 'asc' } },
        installmentRules: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (!globalStructure) {
      throw new Error("Fee structure not found");
    }

    // Block assignment to ARCHIVED structures
    if (globalStructure.status === 'ARCHIVED') {
      throw new Error("Cannot assign students to an ARCHIVED fee structure");
    }

    // 2. Fetch Students (No TX)
    let studentsToAssign = [];
    if (applyToClass && classId) {
      const where = {
        schoolId,
        // academicYearId, // Removed to match frontend list which shows all students in class
        classId: parseInt(classId),
        ...(sectionId && !isNaN(parseInt(sectionId)) && { sectionId: parseInt(sectionId) }),
      };
      studentsToAssign = await prisma.student.findMany({ where });
    } else if (studentIds && studentIds.length > 0) {
      studentsToAssign = await prisma.student.findMany({
        where: {
          userId: { in: studentIds },
          schoolId,
          // academicYearId, // Removed here too for consistency
        },
      });
    } else {
      throw new Error("No students specified");
    }

    if (studentsToAssign.length === 0) {
      throw new Error("No eligible students found");
    }

    // 3. Auto-transition DRAFT to ACTIVE
    if (globalStructure.status === 'DRAFT') {
      await prisma.globalFeeStructure.update({
        where: { id: globalFeeStructureId },
        data: { status: 'ACTIVE' },
      });
    }

    const assignedStudents = [];
    const skippedStudents = [];

    // 4. Assign Loop with Per-Student Transaction
    for (const student of studentsToAssign) {
      try {
        await prisma.$transaction(async (tx) => {
          // Check existing
          const existing = await tx.studentFee.findFirst({
            where: {
              studentId: student.userId,
              academicYearId,
            },
          });

          if (existing) {
            skippedStudents.push({
              studentId: student.userId,
              name: student.name,
              reason: "Already assigned",
            });
            return;
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
        }, {
          maxWait: 5000,
          timeout: 10000
        });

      } catch (err) {
        if (err.code === 'P2002') {
          skippedStudents.push({
            studentId: student.userId,
            name: student.name,
            reason: "Already assigned (Constraint)",
          });
        } else {
          console.error(`Assignment failed for student ${student.userId}:`, err);
          skippedStudents.push({
            studentId: student.userId,
            name: student.name,
            reason: "Processing Error: " + err.message
          });
        }
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

  // FIX: Proper rounding - round down, add remainder to last installment
  const baseAmount = Math.floor((totalAmount / numberOfInstallments) * 100) / 100; // Round to 2 decimals
  const percentagePerInstallment = 100 / numberOfInstallments;

  // Calculate total of all base amounts to find remainder
  const totalBaseAmount = baseAmount * (numberOfInstallments - 1);
  const lastInstallmentAmount = Math.round((totalAmount - totalBaseAmount) * 100) / 100;

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

    // FIX: Last installment gets the remainder to ensure exact total
    const isLastInstallment = i === numberOfInstallments - 1;
    const installmentAmount = isLastInstallment ? lastInstallmentAmount : baseAmount;

    installments.push({
      installmentNumber: i + 1,
      dueDate,
      amount: installmentAmount,
      percentage: percentagePerInstallment,
    });
  }

  return installments;
}